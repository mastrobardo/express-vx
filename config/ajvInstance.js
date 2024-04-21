const Ajv = require('ajv/dist/2019');
const addFormats = require('ajv-formats');
const path = require("path");
const fs = require("fs");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
// ajv.addSchema(require('../schemas/attribute-sets/profile/salary-expectations.json'), 'https://vx.scnd.com/schemas/attribute-sets/salary-expectations');

function loadSchemas(dir) {
    let schemas = {};
  
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        schemas = { ...schemas, ...loadSchemas(fullPath) };
      } else if (path.extname(file) === '.json') {
        const schema = require(fullPath);
        schemas[schema.$id] = schema;
        ajv.addSchema(schema, schema.$id);
      }
    });
  
    return schemas;
  }
  // app.use('/schemas', express.static(path.join(__dirname, 'schemas')));
  // Use the schemas directory as the starting point
const schemas = loadSchemas(path.join(__dirname, '../schemas'));

module.exports = {ajv, schemas};
