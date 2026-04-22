// Export SessionBuilderImpit as default SessionBuilder (impit is the default)
const SessionBuilderImpit = require("./SessionBuilderImpit");

// For backwards compatibility: SessionBuilder.create() → SessionBuilderImpit.create()
module.exports = SessionBuilderImpit;
