export function formatJoiDetails(error) {
  if (!error?.details?.length) {
    return [];
  }

  return error.details.map((detail) => ({
    field: detail.path.length ? detail.path.join(".") : "body",
    message: detail.message.replace(/"/g, ""),
  }));
}
