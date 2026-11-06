# ahmedkharroubi.qd.je — portfolio

A static site (HTML, CSS, JavaScript, no build step) for GitHub Pages.

- English / French menu with flags. The default follows the device language; a visitor's choice is remembered. `?lang=fr` or `?lang=en` forces one.
- Light / dark switch. The default follows the device; the switch shows the opposite, and pressing it again returns to "follow the device".
- Projects, a case study for each, the automation section, services, process, contact cards, a contact form, a quick-actions menu (Ctrl K / ⌘ K) and a downloadable contact card.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The page |
| `assets/js/content.js` | **All the text, in English and French, and the projects.** Edit this to change wording or add a project. |
| `assets/js/main.js` | Language, theme, projects, form, menus |
| `assets/css/style.css` | Design. Colours are at the top (`--bg`, `--fg`…): each one is `light-dark(light value, dark value)`. |
| `assets/work/` | Project screenshots (`.webp`, 1600×1000 desktop, 640 px wide phone) |
| `CNAME` | The custom domain, `ahmedkharroubi.qd.je` |
| `404.html` | "Page not found" page |

### Add a project

Copy one of the objects in `PROJECTS` (`assets/js/content.js`) and fill it in:
`kind` is `built` or `collab`; `status` is `live` or `product`; `url` and `repo` can be `null`.
Put screenshots in `assets/work/` and list them in `shots` (and `mobile` for a phone screenshot).
Without screenshots the card shows a drawn cover (`art: "bgm"` or `art: "balloons"`).

## Put it online (GitHub Pages)

GitHub Pages on a free account only publishes **public** repositories, so give the site its own public repository:

1. On GitHub, create a new **public** repository named `ahmedkharroubi61-hash.github.io`.
2. Upload the **contents** of this `portfolio` folder to the root of that repository (so `index.html` and `CNAME` are at the top level), on the `main` branch.
3. Repository → **Settings → Pages**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
4. Same page, **Custom domain**: `ahmedkharroubi.qd.je` → Save. (Your domain is already verified on your GitHub account.)
5. Add the DNS records below, wait for the check to turn green, then tick **Enforce HTTPS**.

### DNS at deSEC (zone `ahmedkharroubi.qd.je`)

In deSEC, open the domain and add these records with an **empty subname** (the domain itself). Keep the `NS` records that digitalplat.org points to deSEC.

| Type | Subname | Values |
| --- | --- | --- |
| `A` | *(empty)* | `185.199.108.153` `185.199.109.153` `185.199.110.153` `185.199.111.153` |
| `AAAA` | *(empty)* | `2606:50c0:8000::153` `2606:50c0:8001::153` `2606:50c0:8002::153` `2606:50c0:8003::153` |
| `CNAME` *(optional)* | `www` | `ahmedkharroubi61-hash.github.io.` |

A domain name itself can't be a `CNAME`, which is why it uses the `A`/`AAAA` addresses of GitHub Pages. Check with `dig ahmedkharroubi.qd.je +short`. Changes usually show within minutes; GitHub's HTTPS certificate can take up to an hour after that.

## Contact form

Messages are sent through [FormSubmit](https://formsubmit.co) to `ahmedkharroubi61@gmail.com`; no account or server needed.

- **The very first message triggers an activation email from FormSubmit.** Open it and click *Activate Form*; until then messages are not delivered. Send yourself a test message right after going live.
- After activation FormSubmit gives you a random address alias. To keep your email out of the page source, replace the email in `CONTACT.email`'s use in `main.js` (`https://formsubmit.co/ajax/…`) with that alias.
- If sending fails, the form offers to send the same message on WhatsApp.

## Preview locally

```bash
cd portfolio && python3 -m http.server 8000
```

Then open http://localhost:8000.
