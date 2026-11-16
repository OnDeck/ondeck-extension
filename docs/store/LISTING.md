# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste. Images in this
folder are the real popup with demo data, captured from a production build.

## Store listing

**Name:** OnDeck

**Summary** (matches the manifest `description`, 132 characters max):

> A calm GitHub notifications inbox in your toolbar: review requests, mentions and assignments, with desktop alerts.

**Category:** Developer Tools

**Description:**

> OnDeck turns your GitHub notifications into a calm inbox that lives in your toolbar.
>
> • See review requests, mentions and assignments first. Threads that need you are highlighted, and watcher noise isn't.
> • Filter by Unread, Participating, Mentions, Reviews or Assigned, by repository or date, or search with ⌘K.
> • Mark a single thread as read, or everything you're looking at in one click.
> • Keep an eye on the unread count on the toolbar icon. It updates in the background every 5 to 60 minutes.
> • Get desktop notifications for the reasons you choose. Click one to jump straight to the pull request or issue.
> • The popup opens instantly with your last synced inbox, then refreshes in place.
>
> Privacy: OnDeck only talks to GitHub. Your token stays encrypted in your browser and is only ever sent to api.github.com. There's no OnDeck server, no analytics and no tracking.
>
> Setup takes a minute: click Sign in with GitHub and enter the one-time code, or paste a classic token with the notifications and repo scopes.

**Images:**

| File | Use |
| --- | --- |
| `1-inbox.png` | Screenshot 1 (1280×800) |
| `2-filters.png` | Screenshot 2 |
| `3-mark-all.png` | Screenshot 3 |
| `4-alerts.png` | Screenshot 4 |
| `5-setup.png` | Screenshot 5 |
| `promo-tile-440x280.png` | Small promo tile |
| `public/icons/icon128.png` | Store icon |

## Privacy practices

**Single purpose:**

> Shows the signed-in user's GitHub notifications in a toolbar popup and alerts them when new ones arrive.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `storage` | Stores the user's encrypted GitHub token, a cache of their unread notifications so the popup opens instantly, and their settings (sync interval, alert preferences). |
| `notifications` | Shows desktop alerts for new GitHub notifications the user has opted into. |
| `alarms` | Runs the background sync at the interval the user picks (5–60 minutes) to update the badge and detect new notifications. |
| Host `https://api.github.com/*` | Reads the user's notifications and marks them as read through the GitHub REST API. |
| Host `https://github.com/login/*` | Sign in with GitHub: requests a one-time device code and exchanges it for an access token through GitHub's OAuth device flow. Those endpoints don't allow cross-origin requests, so the extension needs host access to call them. Nothing else on github.com is accessed. |

**Remote code:** No. All JavaScript, CSS and fonts ship in the package.

**Data usage:** tick these and nothing else:

- **Authentication information:** the GitHub personal access token the user pastes in.
- **Personal communications:** notification titles and repository names returned by GitHub.

Certify all three: not sold or transferred to third parties, not used for purposes unrelated to the single purpose, and not used for creditworthiness or lending. Data is stored only in the user's browser and only ever sent to GitHub (github.com/login for sign-in, api.github.com for notifications).

**Privacy policy URL:** the site's `/privacy` page (OnDeck/ondeck-site#6).

## Notes for reviewers

> OnDeck needs a GitHub personal access token (classic) with the `notifications` and `repo` scopes. A token for a test account is included below. Paste it into the popup and press Enter. The inbox, filters, mark-as-read and Settings → Desktop Notifications are all reachable from the popup.

Create a throwaway GitHub account with a few notifications for this, and put
its token in the dashboard's test-instructions field. Don't use your own.

## Before submitting

- [ ] Publish the privacy policy (OnDeck/ondeck-site#6) and add its URL above
- [ ] Set `homepage_url` in `public/manifest.json` once the site has a domain
- [ ] Check a classic token with only `notifications` against private-repo notifications; if it works, drop `repo` from the sign-in link, this doc and the site
- [ ] Run the **Release** workflow to cut v1.0.0, then upload a zip of the `dist/` build from that tag
- [ ] Submit as **Unlisted** first, then put the listing URL on the site (OnDeck/ondeck-site#10)
