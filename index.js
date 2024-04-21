const express = require('express');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2019');
const addFormats = require("ajv-formats");

const mongoose = require('mongoose');

const app = express();
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv)
const port = 3000;

mongoose.connect('mongodb://localhost:27017/mydatabase', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

const genericSchema = new mongoose.Schema({
  schema: { // Changed from schemaId to schema
    type: String,
    required: true
  },
  data: mongoose.Schema.Types.Mixed
});
const GenericModel = mongoose.model('Generic', genericSchema);

function loadSchemas(dir) {
  let schemas = {};

  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      schemas = { ...schemas, ...loadSchemas(fullPath) };
    } else if (path.extname(file) === '.json') {
      const schema = require(fullPath);
      schemas[schema.$id] = schema;
      console.log('adding => ', schema.$id)
      ajv.addSchema(schema, schema.$id);
    }
  });

  return schemas;
}
// app.use('/schemas', express.static(path.join(__dirname, 'schemas')));
// Use the schemas directory as the starting point
const schemas = loadSchemas(path.join(__dirname, 'schemas'));
app.use(express.json());

app.get('/schemas', (req, res) => {
    res.json(schemas);
});

// POST endpoint to validate and store listings
app.post('/listing', async (req, res) => {
  const { schema, ...data } = req.body; // Changed from schemaId to schema

  console.log(req.body)

  if (!schema || !ajv.getSchema(schema)) {
    return res.status(400).send({ message: 'Invalid or missing schema.' }); // Changed the message accordingly
  }


  const validate = ajv.getSchema(schema);
  
  console.log('validating', data)
  console.log(data)
  if (!validate(req.body)) {
    return res.status(400).send({ message: 'Validation failed', errors: validate.errors });
  }

  try {
    const document = new GenericModel({ schema, data });
    await document.save();
    res.send({ message: 'Data is valid and saved to MongoDB', document });
  } catch (error) {
    res.status(500).send({ message: 'Failed to save the document', error });
  }
});


app.get('/listings/:type', async (req, res) => {
    const type = req.params.type;
  
    try {
      // Fetch listings that match the schema type
      const listings = await GenericModel.find({ schema: type });
  
      // Map each listing to its 'data' field, assuming 'data' contains the entire object you want to return
      const listingData = listings.map(listing => listing.data);
  
      // Respond with the array of objects stored under the 'data' field of each listing
      res.json(listingData);
    } catch (error) {
      console.error('Failed to retrieve listings:', error);
      res.status(500).send({ message: 'Failed to retrieve listings' });
    }
  });
  

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
