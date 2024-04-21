// routes/hubs.js
const express = require("express");
const { v4: uuidv4 } = require('uuid');

module.exports = (ajv, GenericModel) => {
  const router = express.Router();
  const schemaId = "https://vx.scnd.com/schemas/types/hub/hub";

  /**
   * @swagger
   * /hubs:
   *   post:
   *     summary: Create a new hub
   *     tags: [Hubs]
   *     description: Creates a new hub with the given data after validating it against a predefined schema. Supports types 'org' and 'clan'.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               schema:
   *                 type: string
   *                 description: Schema URL
   *                 example: "https://vx.scnd.com/schemas/types/hub/org"
   *               data:
   *                 type: object
   *                 description: Data to be validated and stored
   *     responses:
   *       200:
   *         description: Data is valid and was saved successfully.
   *       400:
   *         description: Validation failed or schema is missing.
   *       404:
   *         description: Schema not found.
   *       500:
   *         description: Failed to save the document.
   */
  router.post("/", async (req, res) => {
      let { schema, ...data } = req.body;
  
      if (!schema) {
        return res.status(400).send({
          error: { key: 'hubs.error.400_schema_missing', fallback: 'Schema is missing.' }
        });
      }
  
      const validate = ajv.getSchema(schema);
  
      if (!validate) {
        return res.status(404).send({
          error: { key: 'hubs.error.400_schema_not_found', fallback: `Schema not found: ${schema}` }
        });
      }
  
      console.log(schema);
  
      if (!data.id) {
          data = { ...data, id: uuidv4() };
      }
  
      if (!validate(req.body)) {
        return res.status(400).send({
          error: { key: 'hubs.error.400_validation_failed', fallback: 'Validation failed', errors: validate.errors }
        });
      }
  
      try {
          const existingDocument = await GenericModel.findOne({ "data.id": data.id, schema: schema });
          if (existingDocument) {
            return res.status(409).send({
              error: { key: 'hubs.error.409_duplicate_id', fallback: 'Document with the same ID already exists' }
          });
          }
  
          const document = new GenericModel({ schema: schema, data: data });
          await document.save();
  
          res.send({ message: "Data is valid and saved successfully", document });
      } catch (error) {
        res.status(500).send({
          error: { key: 'hubs.error.500_failed_post', fallback: 'Failed to save the document', error }
        });
      }
  });  

  /**
   * @swagger
   * /hubs:
   *   get:
   *     tags: [Hubs]
   *     summary: List all hubs
   *     description: Retrieves a list of all hubs stored. Can filter by hub types 'org' and 'clan'.
   *     responses:
   *       200:
   *         description: A list of hubs.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   schema:
   *                     type: string
   *                     description: The hub's schema URL, indicating its type.
   *                     example: "https://vx.scnd.com/schemas/types/hub/clan"
   *                   data:
   *                     type: object
   *                     description: The hub's data.
   *       500:
   *         description: Failed to retrieve hubs.
   */
  router.get("/", async (req, res) => {
    try {
      const hubs = await GenericModel.find({ schema: schemaId });
      res.json(hubs);
    } catch (error) {
      console.error("Failed to retrieve hubs:", error);
      res.status(500).send({
        error: { key: 'hubs.error.500_failed_get', fallback: 'Failed to retrieve hubs', error }
      });
    }
  });


    /**
   * @swagger
   * /hubs/{id}:
   *   patch:
   *     summary: Update a hub
   *     tags: [Hubs]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: string
   *         required: true
   *         description: The hub id
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *     responses:
   *       200:
   *         description: Hub updated successfully
   *         content:
   *           application/json:
   *       400:
   *         description: Validation failed
   *       404:
   *         description: Hub not found
   *       500:
   *         description: Failed to update hub
   */
  router.patch("/:id", async (req, res) => {
    const { id } = req.params;

    const validate = ajv.getSchema(schemaId);
    if (!validate) {
      return res.status(404).send({
        error: { key: 'hubs.400_error.schema_not_found', fallback: `Schema not found: ${schemaId}` }
      });
    }

    if (!validate(req.body)) {
      return res.status(400).send({
        error: { key: 'hubs.error.400_validation_failed', fallback: 'Validation failed', errors: validate.errors }
    });
    
    }

    try {
      const result = await GenericModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });
      if (result) {
        res.json(result);
      } else {
        res.status(404).send({
          error: { key: 'hubs.error.404_hub_not_found', fallback: 'Hub not found' }
      });
      }
    } catch (error) {
      console.error("Error updating hub:", error);
      res.status(500).send({
        error: { key: 'hubs.error.500_failed_patch', fallback: 'Failed to update hub', error }
      });
    }
  });


  //should we validate id is an hub?
  /**
   * @swagger
   * /hubs/{id}:
   *   delete:
   *     summary: Deletes a specific hub
   *     tags: [Hubs]
   *     description: Deletes a hub identified by its unique ID.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique identifier of the hub to delete.
   *     responses:
   *       200:
   *         description: Hub successfully deleted.
   *       404:
   *         description: Hub not found.
   *       500:
   *         description: Server error.
   */
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await GenericModel.findByIdAndDelete(id);
        if (result) {
            res.send({ message: 'Hub deleted successfully' });
        } else {
          res.status(404).send({
            error: { key: 'hubs.error.404_hub_not_found', fallback: 'Hub not found' }
        });
        }
    } catch (error) {
        console.error('Error deleting hub:', error);
        res.status(500).send({
          error: { key: 'hubs.error.500_internal_error', fallback: 'Failed to delete hub', error }
        });
    }
  });

  return router;
};
