# Example schemas

This folder contains example schemas for different entity types. The schemas are written in JSON Schema format and can be used to validate entity data.

We use `draft202012` of JSON Schema for now.

## Folder structure

```
attribute-sets/
  - hub/
    - base-data.json
  - profile
    - base-data.json
  - rfx/
    - project-info.json
    - calendar.json
  - areas.json
  - ...
base/
  - assets.json
  - datetime.json
  - ...
  - system.json (for now a catch-all for other types)
types/
  - vendor/
    - hub/
      - clan.json
      - org.json
    - profile/
      - designer.json
    - rfx/
      - generic.json
```

 * Schemas in `base` are fixed (by us) and provide base data types that can be used as components in attribute sets. Each file is considered
   the basic unit that can be versioned. (Versioning is not yet done.)
 * Schemas in `attribute-sets` are the atomic components to be used at the top-level of an entity. Each `json` file should define a single
   schema used for a top-level field in an entity definition. These will partly be provided by us for basic data items that we expect to exist
   (roughly equivalent to what sometimes is called "system containers" in the design specification).
   Others will be provided by integrators/operators and provide the basic extension mechanism for entities in the system.
 * Schemas in `types` are the top-level schemas for entity types in our domain. They should reference the schemas in `attribute-sets` and
   define the required and optional fields for the entity type. Top-level entity JSON documents are required to carry a "schema" field that
   refers to its schema.

The overall folder structure should follow the schema ids when served from a well-known domain. Ultimately, base schemas could be served from
our domain while operator-defined ones from their domain but for now, we just use the file system and the single well-known base "https://vx.scnd.com/schemas".

## Schema document structure

A schema document should contain at least an `$id` field that reflect on the where the schema can be found. (TBD: should this be absolute or relative?)
If the schema document itself defines a schema, it can define subschemas below the top-level `$defs` key as specified in
https://json-schema.org/understanding-json-schema/structuring#defs. In the case that the schema document does not define a schema but just contains a
selection of subschemas, these can live directly on the top level.

Convention:
 * Define subschemas below `$defs` in a schema document that defines a top-level schema. The subschemas under `$defs` are not expected to be used outside of
   this document.
 * To define a container of schemas, define the subschemas directly on the top level, but don't define a top-level schema.
 * (TBD) convention for whether to prefer more schema documents or rather containers for subschemas
   * benefit of subschemas: less resolution needed, easier to see what is available, group related schemas together, version them together
   * benefit of separate files: can be versioned separately, can be served separately, can be used in different contexts

Subschemas can general be referenced by setting the `$refs` property to the id of the schema document followed by a hash and a JSON Pointer to the subschema.
E.g. to reference a subschema defined locally in the same document use `#/$defs/MySubSchema` or `#/SubSchema`.

## Versioning

TBD - likely just a convention for naming files and folders to include the version number. On top of that some migration mechanism will be needed.

## Custom schema fields for various purposes

### Canonicalization information

TBD - some fields might need to be canonicalized before validation. E.g. we might want to convert "skills" to title case, or enforce a certain format for phone numbers.

### Presentation metadata

TBD - ultimately, we might want to generate some kind of GUI to edit entities based on the schema. For this, we might need additional metadata in the schema that is not used for validation but for presentation purposes. This could include:

 * labels
 * grouping
 * presentation attributes
 * help texts
 * ...

So far, this is out of scope, and we might decide that the schema is not the right place to define presentation information.
