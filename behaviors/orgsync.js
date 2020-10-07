// do a run on just permissions pages first, without action
// then, do a run with the action to a dummy collection
// then do other runs

`
https://orgsync.com/89668/umbrella/group_types
`

import * as lib from '../lib';

async function ajax_complete() {
  return new Promise((resolve, reject) => {
    $(document).ajaxComplete(function wait() {
      $(document).off("ajaxComplete", wait);
      resolve();
    });
  });
}

async function download_attachments() {
  let anchors = Array.from(document.querySelectorAll("a[href^='https://s3.amazonaws.com']:not([data-confirm]), a[href*='download_attachment']:not([data-confirm])"));
  let urls = anchors.map(a => a.href);
  await Promise.all(urls.map(url => fetch(url, {mode:"no-cors"})));
}

function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

function scrape_paginated() {
  // already on a page
  if (new URL(window.location.href).searchParams.get("page") != null) {
    return;
  }

  // no pagination needed
  if (document.querySelector(".pagination") == null) {
    lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    return;
  }

  // otherwise, add all pages to outlist
  let last = Number.parseInt(document.querySelector(".pagination > a:nth-last-child(2)").innerText);

  lib.addOutLinks([...range(1, last)]
    .map(i => {
      let url = new URL(window.location.href);
      url.searchParams.set('page', i);
      return url.href;
    }));
}

let custom_actions = [
  // Download any AWS-hosted attachments.
  {
    re: /^https:\/\/orgsync.com\//,
    run: async function() {
      await download_attachments();
    }
  },

  // stop pjax
  {
    re: /^https:\/\/orgsync.com(?!\/\d+\/budget_admin\/\d+\/review$)/,
    run: async function() {
      document.body.addEventListener('pjax:click', (event) => event.preventDefault());
    }
  },

  // Scrape linked profile pages.
  {
    re: /^https:\/\/orgsync.com\//,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href*='/profile/'][href$=display_profile]:not([data-confirm])"));
    }
  },

  // scrape umbrella
  // https://orgsync.com/89668/umbrella/dashboard
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/dashboard/,
    run: async function() {
    }
  },
  
  // accounts
  // https://orgsync.com/89668/umbrella/accounts
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/accounts$/,
    run: async function() {
      // show more comments
      Array.from(document.querySelectorAll("a[data-remote='true'][href*='comments/show_all?']:not([data-confirm])"))
        .forEach(a => a.click());

      // scrape profile pages
      lib.addOutLinks(document.querySelectorAll("a[href^='/89668/umbrella/accounts/'][href$='/profile']:not([data-confirm])"));

      scrape_paginated();
    }
  },

  // enumerate organizations
  // https://orgsync.com/89668/umbrella/organizations

  // pagination
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/organizations/,
    run: async function() {
      // show more comments
      Array.from(document.querySelectorAll("a[data-remote='true'][href*='comments/show_all?']:not([data-confirm])"))
        .forEach(a => a.click());

      // scrape profile pages
      //lib.addOutLinks(document.querySelectorAll("a.grey-icon-link[href*='umbrella/organizations'][href$='/profile']:not([data-confirm])"));

      // scrape chapter redirects, but not the actual pages
      //await Promise.all(Array.from(document.querySelectorAll("a[href^='/89668/umbrella/organizations/switch?portal_id']:not([data-confirm])"))
      //  .map(a => fetch(a.href, {redirect: 'manual'})));

      scrape_paginated();
    }
  },

  // scrape each category, too
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/organizations$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("#filter-row > div:nth-child(2) > div > ul > li > a:not([data-confirm])"))
    }
  },

  // enumerate budgets
  // https://orgsync.com/89668/umbrella/organizations

  // pagination
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/index/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      scrape_paginated();
    }
  },

  // scrape each period, too
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/index$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("#filter-row > div:nth-child(2) > div > ul > li > a:not([data-confirm])"));
    }
  },

  // https://orgsync.com/89668/budget_admin/index?decided=true
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/index\?decided=true$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("#filter-row > div:nth-child(3) > div > ul > li > a:not([data-confirm])"));
    }
  },

  // settings: Budget Periods
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?(page=\d+&)?type=BudgetPeriod/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      scrape_paginated();
    }
  },

  // settings: Funding Sources
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?type=FundingSource/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // settings: Budget Categories
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?type=MajorLineItemCategory/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // settings: Line Item Categories
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?(page=\d+&)?type=BudgetPeriod/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      scrape_paginated();
    }
  },

  // settings: Reviewers
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?type=TreasuryReviewer/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // settings: Payment Categories
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/list_admin_setting\?type=PaymentCategory/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // settings: Forms
  {
    re: /^https:\/\/orgsync.com\/89668\/budget_admin\/forms$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Decided Position Requests
  // https://orgsync.com/89668/umbrella/requests/position/decided
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/requests\/position\/decided/,
    run: async function() {
      scrape_paginated();
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Incomplete Position Requests
  // https://orgsync.com/89668/umbrella/requests/position/incomplete
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/requests\/position\/incomplete/,
    run: async function() {
      scrape_paginated();
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Involvement Requests
  // https://orgsync.com/89668/umbrella/requests/involvement/memberships?past=true
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/requests\/involvement\/memberships/,
    run: async function() {
      scrape_paginated();
      lib.addOutLinks(document.querySelectorAll("td > a.button[href*='umbrella_requests_involvement']:not([data-confirm])"));
    }
  },
  // Registration Requests
  // https://orgsync.com/89668/umbrella/requests/registration
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/requests\/registration\?decided=true(&page=\d+)?/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      scrape_paginated();
    }
  },

  // Event Requests
  // https://orgsync.com/89668/umbrella/requests/event?past=true
  {
    re: /^https:\/\/orgsync.com\/89668\/umbrella\/requests\/event\?(page=\d+&)?past=true/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      scrape_paginated();
    }
  },

  // Scrape a group.
  // https://orgsync.com/177940/chapter
  {
    re: /^https:\/\/orgsync.com\/\d+\/chapter$/,
    run: async function() {
      let group_id = window.location.pathname.split("/")[1];

      let base = `https://orgsync.com/${group_id}`;

      lib.addOutLinks(
        document.querySelectorAll("#secondary-nav li:not(.current):not(.has-dropdown) > a:not([data-confirm])")
      );

      lib.addOutLinks([
        `${base}/profile`,                      // done
        `${base}/dashboard`,                    // done
        `${base}/administration/join_options`,  // done
        `${base}/social_media_links`,           // done
        `${base}/positions`,                    // TODO: click buttons?
      ]);

      document.querySelector("a[href$='chapter/display_profile']").click();
      await ajax_complete();
      document.querySelector("a[href$='chapter/display_feed']").click()
      await ajax_complete();

      while (document.querySelector("a[data-service='load_more_feed']") != null) {
        document.querySelector("a[data-service='load_more_feed']").click();
        await ajax_complete();
      }

      lib.addOutLinks(document.querySelectorAll("a[href*='/events/']:not([data-confirm])"));

      await Array.from(document.querySelectorAll("img.secondary-nav-image")).map(img => fetch(img.src.split("?")[0], {mode: 'no-cors'}));
      /*
      lib.addOutLinks([
        `${base}/groups`,
        `${base}/positions`,                    // TODO: click buttons
        `${base}/events`,
        `${base}/events?view=upcoming`,         // TODO: unclick "shared"
        `${base}/events?view=past`,             // TODO: unclick "shared"
        `${base}/files`,                        // done
        `${base}/forms`,                        // done, i think...
        `${base}/forms/submissions`,            // done
        `${base}/news_posts`,                   // done
        `${base}/photos/albums`,                // done
        `${base}/messages`,                     // done
        `${base}/contact_books`,                // done
        `${base}/contact_books/export`,         // done
        `${base}/email_lists`,                  // done
        `${base}/email_list_messages`,          // done
        `${base}/polls`,                        // done
        `${base}/bookmarks`,                    // done
        `${base}/custom_pages`,                 // done
        `${base}/timesheet`,
        `${base}/todo_lists`,                   // done
        `${base}/treasury`,                     // done
        `${base}/budget`,                       // done
        `${base}/checkbooks`,                   // done
        `${base}/videos`,                       // done
        `${base}/profile`,                      // done
        `${base}/dashboard`,                    // done
        `${base}/administration/join_options`,  // done
      ]);
      */
    }
  },

  /*
  // ENABLE PERMISSIONS
  // https://orgsync.com/182723/administration/permissions
  {
    re: /^https:\/\/orgsync.com\/\d+\/administration\/permissions$/,
    run: async function() {
      Array.from(document.querySelectorAll(".former-switch-container > input:not(:checked)"))
        .forEach(e => e.click());
      document.querySelector("input[name='commit']").click()
    }
  },
  */

  // treasury links
  // https://orgsync.com/182723/treasury
  {
    re: /^https:\/\/orgsync.com\/\d+\/treasury$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href*='budget']:not([data-confirm]),a[href*='checkbook']:not([data-confirm])"));
    }
  },

  // all form(s) submissions
  // https://orgsync.com/89668/forms/submissions
  // https://orgsync.com/89668/forms/374568/submissions
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/(\d+\/)?submissions$/,
    run: async function() {
      scrape_paginated();
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },
  // all form(s) submissions, page
  // https://orgsync.com/89668/forms/submissions?page=153
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/(\d+\/)?submissions\?page=\d+$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // one form's submissions
  // https://orgsync.com/89668/forms/374580/submissions
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/\d+\/submissions$/,
    run: async function() {
      lib.addOutLinks([
        // scrape the results page
        `${window.location.href}/results`,
        // "go to form"
        new URL(window.location.href + "/..").href.slice(0,-1)]);

      // trigger exports
      await Promise.all(
        Array.from(document.querySelectorAll(".icon-download"))
          .map(a => fetch(a.href)));
    }
  },

  // one form's results
  // https://orgsync.com/89668/forms/374580/submissions/results
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/\d+\/submissions\/results$/,
    run: async function() {
      document.querySelector("#status_approved").click();
      await ajax_complete();
      document.querySelector("#status_").click();
      await ajax_complete();
    }
  },

  // one form submission
  // https://orgsync.com/89668/forms/374580/submissions/43259300?ref=%2F89668%2Fforms%2Fsubmissions%3F_pjax%3D%2523pjax-container%26filter_by%3Dpending%26_pjax%3D%2523pjax-container
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/\d+\/submissions\/\d+/,
    run: async function() {
      let download = Promise.all(Array.from(document.querySelectorAll(".download:not([data-confirm])")).map(a => fetch(a.href)));
      document.querySelector("a[data-tab=reviewers]").click();
      document.querySelector("a[data-tab=submission]").click();
      await download;
    }
  },

  // form page
  // https://orgsync.com/89668/forms/374580
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms\/\d+$/,
    run: async function() {
      // download PDF version
      await Promise.all(Array.from(document.querySelectorAll("a[data-service='download_pdf']:not([data-confirm])"))
        .map(a => fetch(a.href)));
    }
  },

  // form page
  // https://orgsync.com/89668/forms
  {
    re: /^https:\/\/orgsync.com\/\d+\/forms$/,
    run: async function() {
      // in theory this page might be paginated. in practice it isn't.
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href*='forms/submissions']:not([data-confirm])"));
      
    }
  },

  // profile page
  // download attachments
  // https://orgsync.com/177940/profile
  {
    re: /^https:\/\/orgsync.com\/\d+\/profile$/,
    run: async function() {
      // rely on global attachment downloader
    }
  },

  // contact books
  // https://orgsync.com/177940/contact_books
  {
    re: /^https:\/\/orgsync.com\/\d+\/contact_books$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href*='export']:not([data-confirm])"));
    }
  },

  // contact books export
  // https://orgsync.com/177940/contact_books/export
  {
    re: /^https:\/\/orgsync.com\/\d+\/contact_books\/export$/,
    run: async function() {
      await Promise.all(Array.from(document.querySelectorAll("a[href*=export]:not([data-confirm])")).map(a => fetch(a.href)));
    }
  },

  // email_lists
  // https://orgsync.com/177940/email_lists
  {
    re: /^https:\/\/orgsync.com\/\d+\/messages$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href$='contact_books']:not([data-confirm]),a[href$='email_lists']:not([data-confirm])"));
    }
  },

  // email_lists
  // https://orgsync.com/177940/email_lists
  {
    re: /^https:\/\/orgsync.com\/\d+\/email_lists$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href$='email_list_messages']:not([data-confirm])"));
    }
  },

  // email_lists messages
  // https://orgsync.com/177940/email_list_messages
  {
    re: /^https:\/\/orgsync.com\/\d+\/email_list_messages$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // news posts index
  // https://orgsync.com/89668/news_posts
  {
    re: /^https:\/\/orgsync.com\/\d+\/news_posts$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h3 a[href*='/news_posts/']:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href*='/news_posts?month']:not([data-confirm])"));
    }
  },

  // photo albums index
  // https://orgsync.com/177940/photos/albums
  {
    re: /^https:\/\/orgsync.com\/\d+\/photos\/albums$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".album-name > a:not([data-confirm])"));
    }
  },

  // photo
  // https://orgsync.com/177940/photos/albums/127986/photo/2437158
  {
    re: /^https:\/\/orgsync.com\/\d+\/photos\/albums\/\d+$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".js-photo > a:not([data-confirm])"));
    }
  },

  // checkbooks
  // https://orgsync.com/99967/checkbooks
  {
    re: /^https:\/\/orgsync.com\/\d+\/checkbooks$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".main h4 a[href*='/checkbooks/']:not([data-confirm])"));
      await fetch(`${window.location.href}/export`);
    }
  },


  // cycle through budget periods
  // https://orgsync.com/99967/budget
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget$/,
    run: async function() {
      document.querySelector("#floating_loading_tag").style.visibility = "hidden";
      let queue = Array.from(document.querySelectorAll("#budget_period_id > option")).map(o => o.value);

      // this is nice-to-have, but non-essential:
      lib.addOutLinks(queue.map(period => `${window.location.href}?budget_period_id=${period}`));

      for(let option = queue.shift(); option != undefined; option = queue.shift()) {
        document.querySelector("#budget_period_id").value = option;
        document.querySelector("#budget_period_id").dispatchEvent(new Event("change"));
        await ajax_complete();
      }
    }
  },
  // adding all budgets for each period to the outlinks list.
  // https://orgsync.com/99967/budget?budget_period_id=1472
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget\?budget_period_id=\d+$/,
    run: async function() {
      // TODO!!!!! do not data-confirm for EVERYTHING jfc. [done]
      // this got deleted :(
      // https://orgsync.com/158798/budget/872125/edit_budget_request
      lib.addOutLinks(document.querySelectorAll("#budget_list tbody a:not(.icon-discussion):not([data-confirm])"));
    }
  },

  // budget view.
  // add budget items to outlinks list,
  // download export pdf
  // https://orgsync.com/99967/budget/215468
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget\/\d+$/,
    run: async function() {
      // scrape individual budget items
      lib.addOutLinks(document.querySelectorAll("a[href*='budget_items']:not([data-confirm])"));
      await fetch(`${window.location.href}/export_pdf`);
    }
  },
  
  // edit budget view.
  // https://orgsync.com/177940/budget/958479/edit_budget_request
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget\/\d+\/edit_budget_request$/,
    run: async function() {
      lib.addOutLinks([new URL(window.location.href + "/..").href]);
    }
  },

  // budget items.
  // https://orgsync.com/99967/budget/355573/budget_items/706604
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget\/\d+\/budget_items\/\d+$/,
    run: async function() {
      // scrape individual budget items
      lib.addOutLinks(document.querySelectorAll("a[href*='show_payment_request']:not([data-confirm])"));
    }
  },

  // payment request
  // https://orgsync.com/99967/budget/542933/show_payment_request
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget\/\d+\/show_payment_request$/,
    run: async function() {
      // scrape payment requests
      lib.addOutLinks(document.querySelectorAll("a[href*='show_payment_request']:not([data-confirm])"));
      // pdf export
      await fetch(new URL(window.location.href + "/../export_pdf").href);
    }
  },

  // view folder
  // add sub-folders and files as outlinks
  // https://orgsync.com/177940/files
  {
    re: /^https:\/\/orgsync.com\/\d+\/files(\/\d+)?$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".files h4 > a:not([data-confirm])"));
    }
  },

  // view file
  // add download urls as outlinks
  // https://orgsync.com/177940/files/1522261/show
  {
    re: /^https:\/\/orgsync.com\/\d+\/files\/\d+\/show$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href*='download']:not([data-confirm])"));
    }
  },

  // view group members
  // https://orgsync.com/177940/groups
  {
    re: /^https:\/\/orgsync.com\/\d+\/groups$/,
    run: async function() {
      await Promise.all([
        fetch(`${window.location.href}/export?format=xlsx`),
        fetch(`${window.location.href}/export?format=csv`),
      ]);
    }
  },

  // Review Budget Request
  // https://orgsync.com/89668/budget_admin/958235/review
  {
    re: /^https:\/\/orgsync.com\/\d+\/budget_admin\/\d+\/review$/,
    run: async function() {
      let popup = document.querySelector("a[href*='treasury_popup']");
      if (popup != null) {
        popup.click();
        await ajax_complete();
        document.querySelector(".js-olay-show").style.display = "none";
        await download_attachments();
        document.querySelector(".popup-close").click();
      }
    }
  },

  // Videos
  // https://orgsync.com/177940/videos
  {
    re: /^https:\/\/orgsync.com\/\d+\/videos$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".content-pane > h2 > a:not([data-confirm])"));
    }
  },

  // Polls
  // https://orgsync.com/177940/polls
  {
    re: /^https:\/\/orgsync.com\/\d+\/polls$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href*='closed_list']:not([data-confirm])"));
      lib.addOutLinks(document.querySelectorAll("a[href*='unpublished_list']:not([data-confirm])"));
    }
  },

  // Closed Polls
  // https://orgsync.com/177940/polls/closed_list
  {
    re: /^https:\/\/orgsync.com\/\d+\/polls\/closed_list$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Unpublished Polls
  // https://orgsync.com/177940/polls/unpublished_list
  {
    re: /^https:\/\/orgsync.com\/\d+\/polls\/unpublished_list$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Todos Lists
  // https://orgsync.com/177940/todo_lists
  {
    re: /^https:\/\/orgsync.com\/\d+\/todo_lists$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Custom Pages
  // https://orgsync.com/182723/custom_pages
  {
    re: /^https:\/\/orgsync.com\/\d+\/custom_pages$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },

  // Timesheet
  // https://orgsync.com/177940/timesheet
  {
    re: /^https:\/\/orgsync.com\/\d+\/timesheet$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href*='/timesheet/by_account?account=']:not([data-confirm])"));

      lib.addOutLinks([
        `${window.location.href}?utf8=%E2%9C%93&members=all&group=&from_date=&to_date=&q=&sort=&commit=Filter`,
        `${window.location.href}?utf8=%E2%9C%93&members=current&group=&from_date=&to_date=&q=&sort=&commit=Filter`,
      ]);

      await Promise.all([
        fetch(`${window.location.href}/export_organization_timesheets.csv.xlsx`),
        fetch(`${window.location.href}/export_organization_timesheets.csv.csv`),
        fetch(`${window.location.href}/export_organization_timesheets.csv.xlsx?from_date=&group=&q=&sort=&to_date=`),
        fetch(`${window.location.href}/export_organization_timesheets.csv.csv?from_date=&group=&q=&sort=&to_date=`),
      ])
    }
  },

  // Timesheet
  // https://orgsync.com/177940/timesheet
  {
    re: /^https:\/\/orgsync.com\/\d+\/timesheet\?/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href*='/timesheet/by_account?account=']:not([data-confirm])"));
    }
  },

  // Timesheet
  // https://orgsync.com/177940/timesheet/by_account?account=7446265
  {
    re: /^https:\/\/orgsync.com\/\d+\/timesheet\/by_account\?/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
      await Promise.all(
        Array.from(document.querySelectorAll(".icon-download:not([data-confirm])"))
          .map(a => fetch(a.href)));
    }
  },

  // Event
  // https://orgsync.com/158798/events/2232737/occurrences/5336612
  {
    re: /^https:\/\/orgsync.com\/\d+\/events\/\d+\/occurrences\/\d+$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("a[href$='/participants']:not([data-confirm])"));
      await Promise.all(
        Array.from(document.querySelectorAll("a[href*='/download_vcal']:not([data-confirm])"))
          .map(a => fetch(a.href)));
    }
  },

  // Event Participation
  // https://orgsync.com/158798/events/2232737/occurrences/5336612/participants
  {
    re: /^https:\/\/orgsync.com\/\d+\/events\/\d+\/occurrences\/\d+\/participants$/,
    run: async function() {
      await Promise.all(
        Array.from(document.querySelectorAll("a[href$='/participants/export_participation']:not([data-confirm])"))
          .map(a => fetch(a.href)));
    }
  },

  // Forums
  // https://orgsync.com/177940/forums
  {
    re: /^https:\/\/orgsync.com\/\d+\/forums$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },
  // Forums
  // https://orgsync.com/177940/forums/29531
  {
    re: /^https:\/\/orgsync.com\/\d+\/forums\/\d+$/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll("h4 > a:not([data-confirm])"));
    }
  },
  // Messages
  // https://orgsync.com/messages
  {
    re: /^https:\/\/orgsync.com\/messages/,
    run: async function() {
      lib.addOutLinks(document.querySelectorAll(".media-body a:not([data-confirm])"));
      scrape_paginated();
    }
  },
  // Exports
  // https://orgsync.com/my/exports
  {
    re: /^https:\/\/orgsync.com\/my\/exports/,
    run: async function() {
      // download export
      lib.addOutLinks(document.querySelectorAll("#list-contents > table > tbody > tr > td:nth-child(1) > a:not([data-confirm])"));
    }
  },
  // Home
  // https://orgsync.com/home/741
  {
    re: /^https:\/\/orgsync.com\/home\/741$/,
    run: async function() {
      while (document.querySelector("a[data-service='load_more_feed']") != null) {
        document.querySelector("a[data-service='load_more_feed']").click();
        await ajax_complete();
      }
    }
  },

];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function* behavior(init) {
  // disable websockets
  WebSocket.prototype.send = function(){};

  const state = {};
  if (init && typeof init.fallbackMsg === 'string') {
    // for when we fall back to this behavior
    yield lib.stateWithMsgNoWait(init.fallbackMsg, state);
  } else {
    yield lib.stateWithMsgNoWait('Beginning Orgsync Scrape', state);
  }

  await lib.domCompletePromise();

  lib.addOutLinks([]);
  yield lib.stateWithMsgNoWait('ORGSYNC run_custom_actions START', Array.from(window.$wbOutlinkSet$));
  for (let action of custom_actions) {
    if (!action.re.test(window.location.href)) { continue; }
    try {
      await action.run();
    } catch(e) {
      yield lib.stateWithMsgNoWait('ORGSYNC Scraper ERROR', {
          url: window.location.href,
          err: e.toString(),
          stack: e.stack,
        });
    }
  }

  return lib.stateWithMsgWait('ORGSYNC Waiting for network idle', {});
  return lib.stateWithMsgNoWait('ORGSYNC Scraper Finished', Array.from(window.$wbOutlinkSet$ || []));
}

export const metadata = {
  name: 'orgsync',
  displayName: 'OrgSync',
  defaultBehavior: true,
  description:
    'Scrape OrgSync.',
};

export const isBehavior = true;
