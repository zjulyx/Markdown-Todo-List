import fs from 'fs'
import readline from 'readline'
import * as constants from '../model/constants'
import * as util from './util'
import * as fileOperation from './fileOperation'

export let CurId = 0

export function IncreaseCurId() {
    if (util.IsMainProcess()) {
        // main process cannot access vux
        return ++CurId
    } else {
        const vux = require('../renderer/store/vuxOperation')
        let curId = vux.GetVuxData(constants.CurId)
        vux.SetVuxData(++curId, constants.CurId)
        return curId
    }
}

function convertEachDayArrToMarkDown(arr, preBlank = '') {
    let res = ''
    if (arr) {
        for (let obj of arr) {
            let progress = util.ConvertProgressToDisplay(obj.progress)
            res += `${preBlank}- [${obj.finished ? 'x' : ' '}] ${obj.label} (${progress})\r\n`
            res += convertEachDayArrToMarkDown(obj.children, preBlank + '    ')
        }
    }
    return res
}

export function convertObjToMarkDown(obj, filename) {
    let res = `# ${obj[constants.Title] || fileOperation.GetFileNameWithoutExtension(filename)}\r\n\r\n`
    let keyDict = Object.keys(obj).sort((a, b) => { return new Date(a) - new Date(b) })
    for (let [index, curDate] of keyDict.entries()) {
        if (curDate !== constants.Title) {
            res += `## ${curDate}\r\n\r\n`
            res += convertEachDayArrToMarkDown(obj[curDate]);
            if (index !== keyDict.length - 1) {
                res += '\r\n'
            }
        }
    }
    return res
}

function parseTodoItem(line) {
    let arr = /[-|*]\s*\[(.*)\]\s*(.*)\((.*)%\)/.exec(line)
    if (!arr) {
        // no progress value
        arr = /[-|*]\s*\[(.*)\]\s*(.*)/.exec(line)
    }
    let finished = arr[1].trim() === 'x'
    let label = arr[2].trim()
    let progress = arr.length >= 4 ? util.ConvertProgressToInternal(arr[3]) : NaN
    if (isNaN(progress)) {
        // if not defined progress, use finished as standard
        progress = finished ? constants.MAXPROGRESS : 0
    } else if (progress === constants.MAXPROGRESS) {
        // if has defined progress, use progress as standard
        finished = true
    } else {
        finished = false
    }
    return {
        id: IncreaseCurId(),
        finished: finished,
        label: label,
        progress: progress,
        children: []
    }
}

export function convertMarkDownToObj(markdownFile, finishCallback) {
    let markdownStream = fs.createReadStream(markdownFile);
    let markdown = readline.createInterface({
        input: markdownStream
    });
    let res = {}
    let stack = []
    let curDate = util.FormatDateTime()
    let hasError = false
    let canceled = false
    markdown.on('line', line => {
        try {
            switch (line[0]) {
                case ' ':
                case '\t':
                    if (!line.trimLeft().startsWith('-') && !line.trimLeft().startsWith('*')) {
                        break
                    }
                    let curNode = parseTodoItem(line.trimLeft())
                    let curBlankCount = line.length - line.trimLeft().length
                    let curLevel = curBlankCount / 4 + 1
                    if (curLevel <= stack.length) {
                        stack.splice(curLevel - 1, stack.length)
                    }
                    let parent = stack[stack.length - 1]
                    parent.children.push(curNode)
                    stack.push(curNode)
                    break
                case '#':
                    if (line.startsWith('##')) {
                        // date
                        let arr = /##(.*)/.exec(line)
                        curDate = util.FormatDateTime(arr[1].trim())
                        if (!(curDate in res)) {
                            res[curDate] = []
                        }
                    } else {
                        // title
                        let arr = /#(.*)/.exec(line)
                        res[constants.Title] = arr[1].trim()
                    }
                    break
                case '-':
                case '*':
                    res[curDate].push(parseTodoItem(line))
                    stack = [res[curDate][0]]
                    break
                default:
                    break
            }
        } catch (ex) {
            // find error in parse
            markdown.pause()
            hasError = true
            let err = `Error in ${markdownFile}!!!\r\n${ex}\r\n`
            if (util.IsMainProcess()) {
                // main process
                canceled = true
                markdown.close()
                util.ShowError(`${err}Cancel open it!`)
            } else {
                // renderer process
                util.ShowDialog(`${err}Will reset its data. Are you sure?`, {
                    type: constants.DialogTypes.question,
                    resolve: () => {
                        markdown.close()
                    },
                    reject: () => {
                        canceled = true
                        markdown.close()
                    }
                })
            }
        }
    })

    markdown.on('close', () => {
        res = hasError ? { [constants.Title]: fileOperation.GetFileNameWithoutExtension(markdownFile) } : res
        finishCallback(res, canceled)
    })
}
