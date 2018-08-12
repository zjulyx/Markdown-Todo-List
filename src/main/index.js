'use strict'

import {
    app,
    BrowserWindow,
    Menu,
    ipcMain,
    nativeImage
} from 'electron'
import * as fileOperation from '../utils/fileOperation'
import * as constants from '../model/constants'

global.sharedData = {
    [constants.Files]: [],
    [constants.TabsData]: [],
    [constants.CurTab]: '-1',
    [constants.CurId]: 0,
    [constants.OnlyShowContentDate]: true
}

let mainWindow

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const winURL =
    (process.env.NODE_ENV === 'development' ? `http://localhost:9080` : `file://${__dirname}/index.html`)

function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 563,
        useContentSize: true,
        width: 1000
    })

    mainWindow.loadURL(winURL)

    if (process.platform !== 'darwin') {
        mainWindow.setIcon(nativeImage.createFromPath('build/icons/icon.png'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function createMenu(onlyShowContentDate, autoSync) {
    let template = [{
            label: 'File',
            submenu: [{
                label: 'Open Todo List File',
                accelerator: 'CmdOrCtrl+O',
                click() {
                    fileOperation.OpenMarkdownFile(mainWindow)
                }
            }]
        },
        {
            label: 'Option',
            submenu: [{
                    label: 'Only show date containing todo items',
                    type: 'checkbox',
                    id: constants.OnlyShowContentDate,
                    checked: onlyShowContentDate,
                    click(menuItem) {
                        mainWindow.webContents.send(constants.ToggleSwitchChannel, menuItem)
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Auto sync data',
                    type: 'checkbox',
                    id: constants.AutoSync,
                    checked: autoSync,
                    click(menuItem) {
                        mainWindow.webContents.send(constants.ToggleSwitchChannel, menuItem)
                    }
                },
                {
                    label: 'Download data',
                    click(menuItem) {
                        mainWindow.webContents.send(constants.Download, menuItem)
                    }
                },
                {
                    label: 'Upload data',
                    click(menuItem) {
                        mainWindow.webContents.send(constants.Upload, menuItem)
                    }
                }
            ]
        }
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
    createWindow()
    fileOperation.LoadUserData(userData => {
        global.sharedData = JSON.parse(JSON.stringify(userData))
        createMenu(userData[constants.OnlyShowContentDate], userData[constants.AutoSync])
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on(constants.FileOpenChannel, () => {
    fileOperation.OpenMarkdownFile(mainWindow)
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
