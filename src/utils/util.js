import moment from 'moment'
import * as constants from '../model/constants'

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
