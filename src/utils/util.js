import moment from 'moment'
import * as constants from '../model/constants'
import { dialog, ipcRenderer } from 'electron'

export function ConvertProgressToDisplay(val) {
    return `${(val * 100 / constants.MAXPROGRESS).toFixed(2)}%`
}

export function ConvertProgressToInternal(str) {
    return parseFloat(str) * constants.MAXPROGRESS / 100
}

export function FormatDateTime(date) {
    return moment(date).format('YYYY-MM-DD')
}

export function GenerateNewTabData(fileName, content) {
    let today = FormatDateTime(new Date())
    return {
        [constants.Content]: content,
        [constants.FileName]: fileName,
        [constants.CurDate]: today,
        [constants.FilterText]: '',
        [constants.NewTodo]: ''
    }
}

export function ShowDialog(msg, type) {
    if (dialog) {
        switch (type) {
            case constants.DialogTypes.Confirm:
                dialog.showMessageBox({
                    type: 'question',
                    buttons: ['OK', 'Cancel'],
                    message: msg
                }, (response) => {
                    if (response === 0) {
                        // OK
                    } else {
                        // Cancel
                    }
                })
                break
            case constants.DialogTypes.Error:
                dialog.showErrorBox('Error', msg)
                break
            default:
                break
        }
    } else {
        ipcRenderer.send(constants.OpenDialogChannel, msg, type)
    }
}
