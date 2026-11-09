# Supeesu — GitHub Pages root deployment

The repository root contains `index.html`, `scene.js`, and `scene.css`. The root page is the Living Pool Daily Home. All required modules and assets are included at their existing relative paths.

1. Extract the ZIP. Upload the **contents** of the extracted folder into the repository root, not the enclosing folder.
2. In GitHub: Settings > Pages > Build and deployment > Deploy from a branch. Choose your deployment branch (usually `main`) and folder `/ (root)`, then Save.
3. Open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/` after deployment.
4. The laboratory remains available at `dev/`, and `?lab` on the homepage reveals instruments.

No Python server is needed for GitHub Pages. A local preview still uses `RUN_PREVIEW.bat`. This package does not include a Git repository and does not push to GitHub automatically.

**Important:** Uploading replaces the existing root `index.html`. Back up or commit the current homepage first. GitHub Pages is public by default; review media rights before publishing. The automated test suite remains included for development.
