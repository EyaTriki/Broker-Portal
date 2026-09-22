import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Alert } from 'types/interfaces/Alert'
import { ErrorAlertObject } from '@config/constants/alerts.constants'
import { GLOBAL_VARIABLES } from '@config/constants/globalVariables'
import { AlertType } from '@config/enums/alertType.enum'

interface SnackbarState {
  alert: Alert | null
}

const normalizeAlertMessage = (payload: unknown): string => {
  if (typeof payload === 'string') {
    return payload
  }

  if (payload == null) {
    return GLOBAL_VARIABLES.EMPTY_STRING
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeAlertMessage(item))
      .filter(Boolean)
      .join(', ')
  }

  if (typeof payload === 'object') {
    const msg = (payload as { msg?: unknown }).msg
    if (typeof msg === 'string') {
      return msg
    }

    try {
      return JSON.stringify(payload)
    } catch {
      return String(payload)
    }
  }

  return String(payload)
}

const initialState: SnackbarState = {
  alert: {
    open: false,
    message: GLOBAL_VARIABLES.EMPTY_STRING,
    type: AlertType.SUCCESS,
  },
}

export const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showSuccess: (state, action: PayloadAction<string>) => {
      if (state.alert) {
        state.alert = {
          ...state.alert,
          open: true,
          message: action.payload,
          type: AlertType.SUCCESS,
        }
      }
    },

    showError: (state, action: PayloadAction<unknown>) => {
      if (state.alert) {
        state.alert = {
          ...ErrorAlertObject,
          message: normalizeAlertMessage(action.payload),
        }
      }
    },
    clearSnackbarState: (state) => {
      state.alert = {
        open: false,
        message: GLOBAL_VARIABLES.EMPTY_STRING,
        type: AlertType.SUCCESS,
      }
    },
  },
})

export const { showSuccess, showError, clearSnackbarState } =
  snackbarSlice.actions

export default snackbarSlice.reducer
