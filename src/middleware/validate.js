import { AppError } from "../utils/AppError.js";
import { formatJoiDetails } from "../utils/formatJoiDetails.js";

const sources = {
  body: (req) => req.body,
  query: (req) => req.query,
  params: (req) => req.params,
};

const assignValidated = {
  body: (req, value) => {
    req.body = value;
  },
  query: (req, value) => {
    req.query = value;
  },
  params: (req, value) => {
    req.params = value;
  },
};

export const validate = (schema, source = "body") => (req, res, next) => {
  const getValue = sources[source];
  if (!getValue) {
    return next(new AppError(`Invalid validation source: ${source}`, 500));
  }

  const { error, value } = schema.validate(getValue(req), {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    return next(new AppError("Validation failed", 400, formatJoiDetails(error)));
  }

  assignValidated[source](req, value);
  return next();
};
