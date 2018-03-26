import fs from 'fs'
import path from 'path'
import readline from 'readline'
import * as constants from './constants'
import * as util from './util'

let curId = 0

function convertEachDayArrToMarkDown(arr, preBlank = '') {
    let res = ''
    for (let obj of arr) {
        let progress = util.ConvertProgressToDisplay(obj.progress)
        res += `${preBlank}- [${obj.finished ? 'x' : ' '}] ${obj.label} (${progress})\r\n`
        res += convertEachDayArrToMarkDown(obj.children, preBlank + '    ')
    }
    return res
}

function convertObjToMarkDown(obj) {
    let res = `# ${obj.title}\r\n\r\n`
    delete obj.title
    // console.log(obj)
    let keyDict = Object.keys(obj).sort((a, b) => { return new Date(a) - new Date(b) })
    for (let curDate of keyDict) {
        res += `## ${curDate}\r\n\r\n`
        res += convertEachDayArrToMarkDown(obj[curDate])
    }
    return res
}

function parseTodoItem(line) {
    let arr = /[-|*]\s*\[(.*)\]\s*(.*)\(?(.*)%?\)?/.exec(line)
    let finished = arr[1].trim() === 'x'
    let label = arr[2].trim()
    let progress = util.ConvertProgressToInternal(arr[3])
    if (isNaN(progress)) {
        progress = finished ? constants.MAXPROGRESS : 0
    }
    return {
        id: curId++,
        finished: finished,
        label: label,
        progress: progress,
        children: []
    }
}

function convertMarkDownToObj(markdownFile, finishCallback) {
    let markdownStream = fs.createReadStream(markdownFile);
    let markdown = readline.createInterface({
        input: markdownStream
    });
    let res = {}
    let stack = []
    let curDate = util.FormatDateTime()
    markdown.on('line', line => {
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
                } else {
                    // title
                    let arr = /#(.*)/.exec(line)
                    res.title = arr[1].trim()
                }
                break
            case '-':
            case '*':
                if (!(curDate in res)) {
                    res[curDate] = []
                }
                res[curDate].push(parseTodoItem(line))
                stack = [res[curDate][0]]
                break
            default:
                break
        }
    })

    markdown.on('close', () => {
        finishCallback(res)
    })
}

export function LoadMarkdownFile(markdownFile, callback) {
    fs.access(markdownFile, (err) => {
        if (err) {
            util.MakeDirs(path.dirname(markdownFile), () => {
                fs.writeFile(markdownFile, '', err => {
                    if (err) {
                        console.log(err)
                    }
                    let res = {}
                    callback(res)
                })
            })
        } else {
            convertMarkDownToObj(markdownFile, callback)
        }
    })
}

export function SaveMarkdownFile(markdownFile, obj) {
    fs.writeFile(markdownFile, convertObjToMarkDown(obj), err => {
        if (err) {
            console.log(err)
        }
    })
}
