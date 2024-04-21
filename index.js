const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const {ajv, schemas} = require('./config/ajvInstance');
const GenericModel = require('./models/GenericModel');
const mongoose = require('mongoose');
const path = require("path");
const fs = require("fs");

function loadSchemasRecursively(dir) {
  let schemas = {};
  
  fs.readdirSync(dir).forEach(fileOrDir => {
    const fullPath = path.join(dir, fileOrDir);
    const stat = fs.statSync(fullPath);

    if (stat && stat.isDirectory()) {
      schemas = {
        ...schemas,
        ...loadSchemasRecursively(fullPath)
      };
    } else if (path.extname(fullPath) === '.json') {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const json = JSON.parse(content);
        const schemaName = path.relative(__dirname, fullPath);
        schemas[schemaName] = json;
      } catch (error) {
        console.error(`Error reading or parsing JSON Schema from ${fullPath}:`, error);
      }
    }
  });

  return schemas;
}

const loadedSchemas = loadSchemasRecursively(path.join(__dirname, 'schemas'));

const swaggerOptions = {
  definition: {
      openapi: '3.0.0',
      info: {
          title: 'ExpressVx',
          version: '1.0.0',
          description: 'A simple schema driven web server',
      },
      components: {
        schemas: loadedSchemas
      }
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

const port = 3000;

// const userSchema = require('./schemas/types/user/user.json');
// ajv.addSchema(userSchema, userSchema.$id);

mongoose.connect('mongodb://localhost:27017/expressvx', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.use(express.json());

app.get('/schemas', (req, res) => {
    res.json(schemas);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const hubsRoutes = require('./routes/hubs')(ajv, GenericModel);
const listingsRoutes = require('./routes/listings')(ajv, schemas, GenericModel);
app.use('/hubs', hubsRoutes);
app.use('/listings', listingsRoutes);



app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
