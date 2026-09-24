# tmg-web-app.github.io

Mobile App Programming Native and cross-platform apps that put your business in customers' pockets, 24/7.

## Update a local copy

To pull the latest version of the site onto a laptop or other local machine:

```sh
cd /path/to/tmg-web-app.github.io
git status
git fetch origin main
git checkout main || git checkout -b main FETCH_HEAD
git pull --ff-only origin main
```

If `git status` shows local changes, commit or stash them before running `git pull`.
