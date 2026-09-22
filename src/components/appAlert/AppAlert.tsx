import { Alert, Snackbar } from "@mui/material";
import { useAppSelector, useAppDispatch } from "@redux/hooks";
import { clearSnackbarState } from "@redux/slices/snackbarSlice";

const formatAlertMessage = (message: unknown): string => {
  if (typeof message === "string") {
    return message;
  }

  if (message == null) {
    return "";
  }

  if (Array.isArray(message)) {
    return message
      .map((item) => formatAlertMessage(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof message === "object") {
    const msgField = (message as { msg?: unknown }).msg;
    if (typeof msgField === "string") {
      return msgField;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  return String(message);
};

function AppAlert() {
  const dispatch = useAppDispatch();
  const { alert } = useAppSelector((state) => state.snackbar);

  const handleClose = () => {
    dispatch(clearSnackbarState());
  };
  return (
    <Snackbar
      open={alert?.open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Alert
        onClose={handleClose}
        severity={alert?.type}
        variant="filled"
        sx={{ width: "100%", color: "white" }}
      >
        {formatAlertMessage(alert?.message)}
      </Alert>
    </Snackbar>
  );
}

export default AppAlert;
