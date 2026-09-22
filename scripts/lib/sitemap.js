const fs = require('fs');

function writeSitemapXml(urls, sitemapPath, today) {
  const urlsXml = urls.map(function (u) {
    return '  <url>\n' +
      '    <loc>' + u.loc + '</loc>\n' +
      '    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>' + u.changefreq + '</changefreq>\n' +
      '    <priority>' + u.priority + '</priority>\n' +
      '  </url>';
  }).join('\n');

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urlsXml + '\n' +
    '</urlset>\n';

  fs.writeFileSync(sitemapPath, xml, 'utf8');
}

module.exports = { writeSitemapXml };
