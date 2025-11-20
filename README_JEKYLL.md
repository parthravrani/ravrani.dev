# Jekyll Setup - Minimal Configuration ✅

Jekyll is now installed and configured for **minimal use** - only to reuse navbar and footer components.

## ✅ What's Done

1. **Jekyll Installed**: Version 3.9 (compatible with Ruby 2.6)
2. **Includes Created**:
   - `_includes/navbar.html` - Reusable navigation bar
   - `_includes/footer.html` - Reusable footer
3. **Configuration**: Minimal `_config.yml` - only processes includes, nothing else
4. **Example Updated**: `index.html` now uses includes

## 📝 How to Use

### For Root Pages (index.html)
Add front matter and includes:
```yaml
---
layout: null
base_path: ""
active_page: "home"
---
```

Then replace navbar and footer with:
```liquid
{% include navbar.html base_path="" active_page="home" %}
{% include footer.html base_path="" %}
```

### For Subdirectory Pages (blog/index.html, portfolio/index.html)
```yaml
---
layout: null
base_path: "../"
active_page: "blog"  # or "portfolio"
---
```

```liquid
{% include navbar.html base_path="../" active_page="blog" %}
{% include footer.html base_path="../" %}
```

### For Nested Pages (expertise/python.html)
```yaml
---
layout: null
base_path: "../"
active_page: "expertise"
---
```

```liquid
{% include navbar.html base_path="../" active_page="expertise" %}
{% include footer.html base_path="../" %}
```

## 🚀 Building the Site

```bash
# Build the site
bundle exec jekyll build

# Output will be in _site/ directory
```

## 📁 File Structure

```
ravrani.dev/
├── _includes/          # Reusable components
│   ├── navbar.html     # Navigation bar
│   └── footer.html     # Footer
├── _config.yml         # Jekyll config (minimal)
├── Gemfile             # Ruby dependencies
├── index.html          # ✅ Already updated with includes
└── [other HTML files]  # Update these to use includes
```

## ⚠️ Important Notes

- **Everything else remains static HTML** - no markdown processing
- **CSS/JS files stay in assets/** - no changes needed
- **Only navbar and footer are dynamic** - everything else is unchanged
- **Build output**: `_site/` directory contains the processed HTML files

## 🔄 Next Steps

Update other HTML files (blog/index.html, portfolio/index.html, etc.) to use the includes following the examples above.

