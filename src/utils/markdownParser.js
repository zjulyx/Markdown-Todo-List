import fs from 'fs'
import readline from 'readline'
import * as constants from '../model/constants'
import * as util from './util'
import * as fileOperation from './fileOperation'

export let CurId = 0

export function IncreaseCurId(currentDateItem) {
    return ++currentDateItem.CurId
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

function parseTodoItem(line, currentDateItem) {
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
        id: IncreaseCurId(currentDateItem),
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
    let todoItemMapping = []
    let formatedDate = util.FormatDateTime(Date.now())
    let hasError = false
    let canceled = false
    markdown.on('line', line => {
        try {
            let curBlankCount = line.length - line.trimLeft().length
            line = line.trimLeft()
            if (line.length <= 1) {
                // invalid line
                return
            }

            switch (line[0]) {
                case '#':
                    if (line[1] !== '#') {
                        // only 1 #, means title
                        let arr = /#(.*)/.exec(line)
                        res[constants.Title] = arr[1].trim()
                    } else {
                        // at least 2 #, means date
                        let arr = /##(.*)/.exec(line)
                        let strDate = arr[1].trim()
                        formatedDate = util.FormatDateTime(strDate)
                        if (formatedDate && !(formatedDate in res)) {
                            // only store valid date
                            res[formatedDate] = []
                            res[formatedDate].CurId = 0
                        }
                    }
                    break
                case '-':
                case '*':
                    // todo item with level
                    let newTodoItem = parseTodoItem(line, res[formatedDate])
                    // remove all items that level is equal or higher than this
                    todoItemMapping.splice(curBlankCount, todoItemMapping.length)
                    todoItemMapping[curBlankCount] = newTodoItem

                    let findParent = false
                    for (let i = curBlankCount - 1; i >= 0; --i) {
                        if (todoItemMapping[i]) {
                            // find parent, nearest small level
                            let parent = todoItemMapping[i]
                            parent.children.push(newTodoItem)
                            findParent = true
                            break
                        }
                    }

                    if (!findParent) {
                        // not find parent, regard as root item
                        res[formatedDate].push(newTodoItem)
                    }
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
                // main process, cancel parse
                canceled = true
                markdown.close()
                util.ShowError(`${err}Cancel open it!`)
            } else {
                // renderer process, let user to confirm whether reset
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
        console.log(`hasError: ${hasError}`)
        res = hasError ? { [constants.Title]: fileOperation.GetFileNameWithoutExtension(markdownFile) } : res
        finishCallback(res, canceled)
    })
}
