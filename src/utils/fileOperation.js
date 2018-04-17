import fs from 'fs'
import path from 'path'
import { dialog } from 'electron'
import * as markdownParser from './markdownParser'
import * as util from './util'
import * as constants from '../model/constants';

const fileDialogFilters = [
    { name: 'Markdown Files', extensions: ['md'] },
    { name: 'All Files', extensions: ['*'] }
]

function mkdirs(dirname, callback) {
    fs.access(dirname, err => {
        if (!err) {
            if (callback) {
                callback()
            }
        } else {
            mkdirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback)
            })
        }
    })
}

function handleFileNotExist(file, callback, initData, jsonParse = true) {
    let initStr = jsonParse ? JSON.stringify(initData) : markdownParser.convertObjToMarkDown(initData, file)
    mkdirs(path.dirname(file), () => {
        fs.writeFile(file, initStr, err => {
            if (err) {
                util.ShowError(`${err} in handleFileNotExist!`)
            }
            callback(initData)
        })
    })
}

export function GetFileNameWithoutExtension(filename) {
    return path.basename(filename, path.extname(filename))
}

export function OpenMarkdownFile(mainWindow) {
    dialog.showOpenDialog({
        title: 'Open or create todo list markdown file',
        properties: ['openFile', 'multiSelections', 'promptToCreate'],
        filters: fileDialogFilters
    }, (files) => {
        if (files) {
            mainWindow.webContents.send(constants.FileOpenedChannel, files)
        }
    })
}

export function LoadMarkdownFile(markdownFile, callback) {
    fs.access(markdownFile, (err) => {
        if (err) {
            handleFileNotExist(markdownFile, callback, {}, false)
        } else {
            markdownParser.convertMarkDownToObj(markdownFile, callback)
        }
    })
}

export function LoadUserDataFile(userDataFile, callback) {
    fs.readFile(userDataFile, 'utf-8', (err, res) => {
        try {
            if (err) throw new Error(err);
            callback(JSON.parse(res))
        } catch (ex) {
            handleFileNotExist(
                userDataFile,
                callback,
                {
                    [constants.Files]: [],
                    [constants.CurTab]: '0',
                    [constants.OnlyShowContentDate]: true
                }
            )
        }
    })
}

export function SaveMarkdownFile(markdownFile, obj, callback) {
    fs.writeFile(markdownFile, markdownParser.convertObjToMarkDown(obj, markdownFile), err => {
        if (err) {
            util.ShowError(`${err} in SaveMarkdownFile!`)
        }

        if (callback) {
            callback();
        }
    })
}

export function SaveUserDataFile(userDataFile, obj) {
    fs.writeFile(userDataFile, JSON.stringify(obj), err => {
        if (err) {
            util.ShowError(`${err} in SaveUserDataFile!`)
        }
    })
}
