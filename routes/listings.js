// routes/listings.js
const express = require("express");

module.exports = (ajv, loadedSchemas, GenericModel) => {
  const router = express.Router();

  function validateSchemaGroup(expectedGroup) {
    return function (req, res, next) {
      const { schema } = req.body;
      console.log(loadedSchemas);
      let schemaObject = null;
      for (const key in loadedSchemas) {
        if (
          loadedSchemas.hasOwnProperty(key) &&
          loadedSchemas[key].$id === schema
        ) {
          schemaObject = loadedSchemas[key];
          break;
        }
      }

      if (!schemaObject) {
        return res.status(404).send({ message: `Schema not found: ${schema}` });
      }

      if (schemaObject.group !== expectedGroup) {
        return res.status(400).send({
          message: `Schema is not part of the expected group: ${expectedGroup}`,
        });
      }

      next();
    };
  }

  /**
   * @swagger
   * /listings:
   *   post:
   *     summary: Create a new listing
   *     description: Validates and stores a listing based on a dynamic schema URL provided in the request. The request must conform to the schema associated with the provided schema URL.
   *     tags: [Listings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               schema:
   *                 type: string
   *                 description: The URL of the schema to validate the listing against.
   *               data:
   *                 type: object
   *                 description: The data of the listing to be stored, structure depends on the schema.
   *             required:
   *               - schema
   *     responses:
   *       200:
   *         description: The listing was successfully validated and stored.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 document:
   *                   type: object
   *                   description: The stored listing data.
   *       400:
   *         description: Validation failed, or schema URL is missing.
   *       404:
   *         description: Schema not found.
   *       500:
   *         description: Failed to save the document.
   */
  router.post("/", validateSchemaGroup("profiles"), async (req, res) => {
    const { schema, ...data } = req.body;

    if (!schema) {
      return res.status(400).send({ message: "Schema URL is missing." });
    }

    const validate = ajv.getSchema(schema);
    if (!validate) {
      return res.status(404).send({ message: `Schema not found: ${schema}` });
    }

    console.log(data);

    if (!validate(req.body)) {
      return res
        .status(400)
        .send({ message: "Validation failed", errors: validate.errors });
    }

    try {
      const document = new GenericModel({ schema, data });
      await document.save();
      res.send({ message: "Data is valid and saved successfully", document });
    } catch (error) {
      res.status(500).send({ message: "Failed to save the document", error });
    }
  });

  /**
   * @swagger
   * /listings/{type}:
   *   get:
   *     summary: Retrieve listings by type
   *     description: Retrieves listings filtered by the schema/type provided in the URL parameter. The type corresponds to the schema URL.
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: type
   *         required: true
   *         schema:
   *           type: string
   *         description: The schema URL to filter listings by.
   *     responses:
   *       200:
   *         description: A list of listings filtered by the specified type.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 description: A listing object.
   *       500:
   *         description: Failed to retrieve listings.
   */
  router.get("/:type", async (req, res) => {
    const type = req.params.type;

    try {
      const listings = await GenericModel.find({ schema: type });
      const listingData = listings.map((listing) => listing.data);
      res.json(listingData);
    } catch (error) {
      console.error("Failed to retrieve listings:", error);
      res.status(500).send({ message: "Failed to retrieve listings" });
    }
  });

  // ... other code ...

  /**
   * @swagger
   * /listings/{id}:
   *   delete:
   *     summary: Delete a listing
   *     description: Deletes a listing identified by its unique ID.
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique identifier of the listing to delete.
   *     responses:
   *       200:
   *         description: Listing was successfully deleted.
   *       404:
   *         description: Listing not found.
   *       500:
   *         description: Server error.
   */
  router.delete("/:id", async (req, res) => {
    try {
      const result = await GenericModel.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).send({ message: "Listing not found" });
      }
      res.send({ message: "Listing successfully deleted" });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).send({ message: "Server error" });
    }
  });

  /**
   * @swagger
   * /listings/{id}:
   *   patch:
   *     summary: Update a listing
   *     description: Updates a listing identified by its unique ID with provided data, validating against the listing's schema.
   *     tags: [Listings]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The unique identifier of the listing to update.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: 'schemas\\types\\vendor\\profile\\designer.json'
   *     responses:
   *       200:
   *         description: Listing was successfully updated.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 updatedDocument:
   *                   type: object
   *                   description: The updated listing data.
   *       400:
   *         description: Validation failed.
   *       404:
   *         description: Listing not found.
   *       500:
   *         description: Server error.
   */
  router.patch("/:id", validateSchemaGroup("profiles"), async (req, res) => {
    const { schema, ...updateData } = req.body;

    const validate = ajv.getSchema(schema);
    if (!validate) {
      return res.status(404).send({ message: `Schema not found: ${schema}` });
    }

    if (!validate(updateData)) {
      return res
        .status(400)
        .send({ message: "Validation failed", errors: validate.errors });
    }

    try {
      const updatedDocument = await GenericModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!updatedDocument) {
        return res.status(404).send({ message: "Listing not found" });
      }
      res.json({ message: "Listing successfully updated", updatedDocument });
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).send({ message: "Server error" });
    }
  });

  return router;
};
