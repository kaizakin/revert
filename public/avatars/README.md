# Preset avatars

Drop image files in this folder and they appear in the avatar picker at
`/me` automatically. No code change needed.

- **Formats:** `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`
- **Size:** square, 256x256 is plenty. They render at 96px at most.
- **Filenames** become the label, so name them readably:
  `fox.png` shows as "Fox", `blue-cat.png` shows as "Blue cat".
  Lowercase with hyphens, no spaces.

The list is read from this directory when the app builds, so after adding
files in production you need a redeploy. In development it picks them up on
reload.
