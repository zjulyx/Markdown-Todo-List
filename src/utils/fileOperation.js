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

export function LoadUserData(callback) {
    fs.readFile(constants.UserDataFile, 'utf-8', (err, res) => {
        try {
            if (err) throw new Error(err);
            let userData = JSON.parse(res)
            let files = userData[constants.Files]
            let lastOpenedTab = parseInt(userData[constants.CurTab])
            let lastOpenedTabName = files[lastOpenedTab]
            let count = 0
            let tempFiles = []
            let tempTabsData = []
            let handleResult = function (file, index) {
                return function (res, cancelled) {
                    if (!cancelled) {
                        tempTabsData[index] = util.GenerateNewTabData(file, res)
                        tempFiles[index] = file
                    }
                    if (++count === files.length) {
                        userData[constants.CurId] = markdownParser.CurId
                        userData[constants.TabsData] = util.RemoveNullElementFromArray(tempTabsData)
                        userData[constants.Files] = util.RemoveNullElementFromArray(tempFiles)
                        // find the lastOpenedTab index
                        lastOpenedTab = userData[constants.Files].indexOf(lastOpenedTabName)
                        if (isNaN(lastOpenedTab) || lastOpenedTab < 0 || lastOpenedTab >= files.length) {
                            lastOpenedTab = 0
                        }
                        if (userData[constants.Files].length === 0) {
                            lastOpenedTab = -1
                        }
                        lastOpenedTab = lastOpenedTab.toString()
                        userData[constants.CurTab] = lastOpenedTab
                        callback(userData)
                    }
                }
            }
            files.forEach((file, index) => {
                LoadMarkdownFile(file, handleResult(file, index))
            })
            callback(JSON.parse(res))
        } catch (ex) {
            handleFileNotExist(
                constants.UserDataFile,
                callback,
                constants.InitSettings
            )
        }
    })
}

// export function SaveMarkdownFile(markdownFile, obj, callback) {
//     fs.writeFile(markdownFile, markdownParser.convertObjToMarkDown(obj, markdownFile), err => {
//         if (err) {
//             util.ShowError(`${err} in SaveMarkdownFile!`)
//         }

//         if (callback) {
//             callback();
//         }
//     })
// }

// export function SaveUserDataFile(userDataFile, str) {
//     fs.writeFile(userDataFile, str, err => {
//         if (err) {
//             util.ShowError(`${err} in SaveUserDataFile!`)
//         }
//     })
// }
