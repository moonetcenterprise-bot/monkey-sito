// Evita try/catch ripetuti in ogni controller: inoltra ogni errore async a next().
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
