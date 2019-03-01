import * as lib from '../../lib';
import { selectors, videoPostSelectors, xpathQ } from './shared';

const behaviorStyle = lib.addBehaviorStyle(`
  .wr-debug-visited {border: 6px solid #3232F1;}
  .wr-debug-visited-overlay {border: 6px solid pink;}
`);

const multiImageClickOpts = { safety: 30 * 1000, delayTime: 1000 };

const postTypes = {
  video: Symbol('$$instagram-video-post$$'),
  multiImage: Symbol('$$instagram-multi-image-post$$'),
  commentsOnly: Symbol('$$instagram-comments-only-post$$')
};

let runnerSuppliedXPG;

/**
 * @param {Element | Node | HTMLElement} post
 * @return {boolean}
 */
function isVideoPost(post) {
  let i = 0;
  let len = videoPostSelectors.length;
  for (; i < len; ++i) {
    if (post.querySelector(videoPostSelectors[i]) != null) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Element | Node | HTMLElement} post
 */
function isMultiImagePost(post) {
  return post.querySelector(selectors.multipleImages) != null;
}

/**
 * @desc Determines the type of the post
 * @param {*} post
 * @return {symbol}
 */
function determinePostType(post) {
  if (isMultiImagePost(post)) return postTypes.multiImage;
  if (isVideoPost(post)) return postTypes.video;
  return postTypes.commentsOnly;
}

function loggedIn(xpg) {
  return (
    xpg(xpathQ.notLoggedIn.login).length === 0 &&
    xpg(xpathQ.notLoggedIn.signUp).length === 0
  );
}

/**
 * @desc Executes the xpath query that selects the load more comments button
 * for both variations and returns that element if it exists.
 * @param xpg
 * @return {?Element}
 */
function getMoreComments(xpg) {
  // first check for load more otherwise return the results of querying
  // for show all comments
  const moreComments = xpg(xpathQ.loadMoreComments);
  if (moreComments.length === 0) {
    return xpg(xpathQ.showAllComments)[0];
  }
  return moreComments[0];
}

async function* viewStories() {
  // get the original full URI of the browser
  const originalLoc = window.location.href;
  // click the first story
  const firstStoryClicked = lib.selectElemAndClick(selectors.openStories);
  if (!firstStoryClicked) return; // no storied if
  // history manipulation will change the browser URI so
  // we must wait for that to happen
  await lib.waitForHistoryManipToChangeLocation(originalLoc);
  let wasClicked;
  let videoButton;
  // stories are sorta on autoplay but we should speed things up
  let toBeClicked = lib.qs(selectors.nextStory);
  // we will continue to speed up autoplay untill the next story
  // button does not exist or we are done (window.location.href === originalLoc)
  while (!lib.locationEquals(originalLoc) && toBeClicked != null) {
    wasClicked = await lib.clickWithDelay(toBeClicked);
    // if the next story part button was not clicked
    // or autoplay is finished we are done
    if (!wasClicked || lib.locationEquals(originalLoc)) break;
    videoButton = lib.qs(selectors.storyVideo);
    if (videoButton) {
      // this part of a story is video content
      let maybeVideo = lib.qs('video');
      // click the button if not already playing
      if (maybeVideo && maybeVideo.paused) {
        await lib.clickWithDelay(videoButton);
      }
      // safety check due to autoplay
      if (lib.locationEquals(originalLoc)) break;
      // force play the video if not already playing
      if (maybeVideo && maybeVideo.paused) {
        await lib.noExceptPlayMediaElement(maybeVideo);
      }
      // safety check due to autoplay
      if (lib.locationEquals(originalLoc)) break;
    }
    yield;
    toBeClicked = lib.qs(selectors.nextStory);
  }
}

async function* handlePost(post, xpg) {
  // open the post (displayed in a separate part of the dom)
  // click the first child of the post div (a tag)
  let maybeA = lib.firstChildElementOf(post);
  if (!(maybeA instanceof HTMLAnchorElement)) {
    maybeA = lib.qs('a', maybeA);
  }
  if (!maybeA) {
    throw new Error('booo');
  }
  await lib.clickWithDelay(maybeA);
  // wait for the post dialog to open and get a reference to that dom element
  const popupDialog = await lib.waitForAndSelectElement(
    document,
    selectors.divDialog
  );
  // get the next inner div.dialog because its next sibling is the close button
  // until instagram decides to change things
  const innerDivDialog = lib.qs(selectors.divDialog, popupDialog);
  if (debug) {
    lib.addClass(popupDialog, behaviorStyle.wrDebugVisitedOverlay);
  }
  // maybe our friendo the close button
  const maybeCloseButton = lib.getElemSibling(innerDivDialog);
  const closeButton = lib.elementsNameEquals(maybeCloseButton, 'button')
    ? maybeCloseButton
    : null;
  // get a reference to the posts contents (div.dialog > article)
  const content = lib.qs(selectors.divDialogArticle, innerDivDialog);
  // the next image button exists in the popup post even if the post is not
  // multi-image, so lets get a reference to it
  const displayDiv = lib.qs(selectors.multiImageDisplayDiv, content);
  switch (determinePostType(post)) {
    case postTypes.multiImage: {
      // display each image by clicking the right chevron (next image)
      await lib.selectFromAndClickUntilNullWithDelay(
        content,
        selectors.rightChevron,
        multiImageClickOpts
      );
      break;
    }
    case postTypes.video:
      // select and play the video. The video is a mp4 that is already loaded
      // need to only play it for the length of time we are visiting the post
      // just in case
      await lib.selectElemFromAndClickWithDelay(
        displayDiv,
        selectors.closeVideo
      );
      break;
    // default: just loading comments
  }
  // The load more comments button, depending on the number of comments,
  // will contain two variations of text (see xpathQ for those two variations).
  // getMoreComments handles getting that button for the two variations
  let moreCommentsButton = getMoreComments(xpg);
  while (moreCommentsButton) {
    await lib.clickWithDelay(moreCommentsButton, 1000);
    moreCommentsButton = getMoreComments(xpg);
    yield;
  }
  if (closeButton != null) {
    await lib.clickWithDelay(closeButton);
  } else {
    await lib.clickWithDelay(
      lib.xpathOneOf({
        xpg,
        queries: xpathQ.postPopupClose
      })
    );
  }
}

/**
 * @desc
 * @param {Element} row
 * @param {*} xpg
 * @return {AsyncIterableIterator<*>}
 */
async function* handleRow(row, xpg) {
  if (debug) {
    lib.addClass(row, behaviorStyle.wrDebugVisited);
  }
  await lib.scrollIntoViewWithDelay(row);
  yield* lib.traverseChildrenOf(row, handlePost, xpg);
}

export default async function* instagramUserBehavior(xpg) {
  // view all stories when logged in
  if (loggedIn(xpg)) {
    yield* viewStories();
  }
  runnerSuppliedXPG = xpg;
  const postRowContainer = lib.chainFistChildElemOf(
    lib.qs(selectors.postTopMostContainer),
    2
  );
  if (postRowContainer == null) {
    // we got nothing at this point, HALP!!!
    return;
  }
  // for each post row view the posts it contains
  yield* lib.traverseChildrenOfLoaderParent(postRowContainer, handleRow, xpg);
}

export const metaData = {
  name: 'instagramUserBehavior',
  match: {
    regex: /^https:\/\/(www\.)?instagram\.com\/[^/]+(\/)?$/
  },
  description:
    "Views all the content on an instangram User's page: if the user has stories they are viewed, if a users post has image(s)/video(s) they are viewed, and all comments are retrieved"
};

export const isBehavior = true;