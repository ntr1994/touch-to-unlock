const path = require(`path`);
const { createFilePath } = require(`gatsby-source-filesystem`);
const slugify = require("slugify");

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;
  const bookTemplate = path.resolve(`./src/templates/BookTemplate.js`);

  const result = await graphql(
    `
      {
        bookJsons: allJson(sort: { fields: name, order: ASC }) {
          edges {
            node {
              name
            }
          }
        }
      }
    `
  );
  if (result.errors) {
    throw result.errors;
  }
  const {
    data: { bookJsons },
  } = result;
  bookJsons.edges.forEach((bookJson, index) => {
    createPage({
      path: `/${slugify(bookJson.node.name.toLowerCase())}`,
      component: bookTemplate,
      context: {
        name: bookJson.node.name,
        prevPath:
          index > 0
            ? `/${slugify(bookJsons.edges[index - 1].node.name.toLowerCase())}`
            : null,
        nextPath:
          index < bookJsons.edges.length - 1
            ? `/${slugify(bookJsons.edges[index + 1].node.name.toLowerCase())}`
            : null,
      },
    });
  });
};
