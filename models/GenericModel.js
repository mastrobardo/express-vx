const mongoose = require('mongoose');

const genericSchema = new mongoose.Schema({
  schema: {
    type: String,
    required: true
  },
  data: mongoose.Schema.Types.Mixed
});

const GenericModel = mongoose.model('Generic', genericSchema);

module.exports = GenericModel;
