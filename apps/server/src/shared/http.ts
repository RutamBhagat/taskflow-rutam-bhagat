export function getValidationFields(error: { all: Array<{ path?: string; message: string }> }) {
  const fields: Record<string, string> = {};

  for (const issue of error.all) {
    const field = issue.path?.replace(/^\//, "") || "body";

    if (fields[field]) {
      continue;
    }

    fields[field] = issue.message === "Required property" ? "is required" : issue.message;
  }

  return fields;
}

export function isUnauthorized(code: string | number) {
  return code === 401 || code === "UNAUTHORIZED";
}

export function isForbidden(code: string | number) {
  return code === 403 || code === "FORBIDDEN";
}

export function isNotFound(code: string | number) {
  return code === 404 || code === "NOT_FOUND";
}
