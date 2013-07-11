console.log('docpad');

docpadConfig = {
  renderSingleExtensions: true,
  templateData: {
    site: {
      url: "http://website.com",
      oldUrls: ['www.website.com', 'website.herokuapp.com'],
      title: "Your Website",
      description: "When your website appears in search results in say Google, the text here will be shown underneath your website's title.",
      keywords: "place, your, website, keywoards, here, keep, them, related, to, the, content, of, your, website"
    }
  }
};

module.exports = docpadConfig;

