# Jekyll Setup - Minimal Configuration

This is a minimal Jekyll setup used **only** for reusing the navbar and footer components across all pages.

## What Jekyll Does Here

- **Navbar Component**: Reusable navigation bar (`_includes/navbar.html`)
- **Footer Component**: Reusable footer (`_includes/footer.html`)
- **Everything else**: Remains as static HTML files

## Installation

Jekyll is already installed via Bundler. To use it:

```bash
# Install dependencies (already done)
bundle install

# Build the site
bundle exec jekyll build

# Serve locally for testing
bundle exec jekyll serve
```

## How It Works

1. **Includes Directory**: `_includes/` contains reusable components
   - `navbar.html` - Navigation bar
   - `footer.html` - Footer

2. **Front Matter**: Each HTML file needs front matter at the top:
   ```yaml
   ---
   layout: null
   base_path: ""        # "" for root, "../" for subdirectories
   active_page: "home"  # "home", "portfolio", "blog", "expertise"
   ---
   ```

3. **Using Includes**: Replace navbar and footer sections with:
   ```liquid
   {% include navbar.html base_path="" active_page="home" %}
   {% include footer.html base_path="" %}
   ```

## Base Path Guide

- **Root pages** (index.html): `base_path: ""`
- **Subdirectory pages** (blog/index.html, portfolio/index.html): `base_path: "../"`
- **Nested pages** (expertise/python.html): `base_path: "../"`

## Building for Production

```bash
bundle exec jekyll build
```

The built site will be in `_site/` directory. You can deploy the `_site/` folder or configure your hosting to build automatically.

## Notes

- All HTML files remain as `.html` files
- No markdown processing
- No blog posts or collections
- Minimal Jekyll - only includes functionality
- All CSS/JS remain in assets folder as before

