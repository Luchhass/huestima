const SOCKET_ERROR_CODES = {
  BROWSER_UNAVAILABLE: "browser_unavailable",
  SERVER_UNAVAILABLE: "server_unavailable",
  SERVER_TIMEOUT: "server_timeout",
};

function getErrorCode(response) {
  return response?.errorCode || response?.code || response?.reason || "";
}

function getErrorText(response) {
  return String(response?.error || response?.message || "").toLowerCase();
}

export function isMultiplayerServerIssue(response) {
  const code = getErrorCode(response);
  const errorText = getErrorText(response);

  return (
    code === SOCKET_ERROR_CODES.SERVER_UNAVAILABLE ||
    code === SOCKET_ERROR_CODES.SERVER_TIMEOUT ||
    code === SOCKET_ERROR_CODES.BROWSER_UNAVAILABLE ||
    errorText.includes("server did not respond") ||
    errorText.includes("server is unavailable") ||
    errorText.includes("could not reach")
  );
}

export function getMultiplayerErrorMessage(
  response,
  t,
  fallbackKey = "room.couldNotReachServer",
) {
  const code = getErrorCode(response);

  if (code === SOCKET_ERROR_CODES.SERVER_TIMEOUT) {
    return t("room.serverTimeout");
  }

  if (isMultiplayerServerIssue(response)) {
    return t("room.serverUnavailable");
  }

  return response?.error || t(fallbackKey);
}
