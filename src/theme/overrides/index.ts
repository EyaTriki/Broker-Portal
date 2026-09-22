import { Theme } from '@mui/material'

import button from './button'
import textField from './textField'
import tooltip from './tooltip'
import divider from './divider'
import avatar from './avatar'
import menu from './menu'

export default function overridesMUIComponents(theme: Theme) {
  const components = Object.assign({
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          width: '100%',
          maxWidth: 'none',
          height: '100%',
          overflowX: 'hidden',
        },
        body: {
          width: '100%',
          maxWidth: 'none',
          margin: 0,
          padding: 0,
          overflowX: 'hidden',
          backgroundColor: '#f4f6f5',
        },
        '#root': {
          width: '100%',
          maxWidth: 'none',
          minWidth: '100%',
          margin: 0,
          padding: 0,
          border: 'none',
          textAlign: 'left',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        },
      },
    },
    MuiButton: button(),
    MuiOutlinedInput: textField(theme),
    MuiTooltip: tooltip(theme),
    MuiDivider: divider(theme),
    MuiAvatar: avatar(),
    MuiMenu: menu(theme),
  })

  return components
}
