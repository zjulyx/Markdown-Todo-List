import fs from 'fs'
import axios from 'axios'
import _ from 'lodash'

import * as vux from "../renderer/store/vuxOperation";
import * as util from "./util";
import * as markdownParser from "./markdownParser";
import * as fileOperation from "./fileOperation";
import * as constants from '../model/constants';

function upload() {
    console.log(`internal upload`)
    checkParas((localFiles, authorization, gistId) => {
        axios.patch(`https://api.github.com/gists/${gistId}`,
            {
                files: localFiles,
                description: constants.GistDescription
            },
            {
                headers: {
                    Authorization: authorization
                }
            }).then((response) => {
                // compare local and remote version
                console.log(`finish upload`);
                console.log(response);
            }).catch((error) => {
                console.log(error);
            });
    })
}

export let uploadGist = _.debounce(upload, constants.DebounceMs)

export function download() {
    checkParas((localFiles, authorization, gistId) => {
        axios.get(`https://api.github.com/gists/${gistId}`,
            {
                headers: {
                    Authorization: authorization
                }
            }).then((response) => {
                // compare local and remote version
                console.log(response);
                let remoteFiles = response.data.files
                // first download settings
                for (let fileName in remoteFiles) {
                    if (fileName.endsWith(constants.UserDataFileName)) {
                        // settings
                        fs.writeFileSync(constants.UserDataFile, remoteFiles[fileName].content)
                    } else {
                        fs.writeFileSync(fileName, remoteFiles[fileName].content)
                    }
                }
                // next download opened files
                LoadUserDataFile()
            }).catch((error) => {
                console.log(error);
            });
    })
}

export let downloadGist = _.debounce(download, constants.DebounceMs)

export function LoadUserDataFile() {
    fileOperation.LoadUserData(userData => {
        console.log(userData)
        for (let key in userData) {
            vux.SetVuxData(userData[key], key)
        }
    })
}

export function SaveUserDataFile() {
    let files = vux.GetVuxData(constants.Files)
    let curTab = vux.GetVuxData(constants.CurTab)
    let onlyShowContentDate = vux.GetVuxData(constants.OnlyShowContentDate)
    let gistId = vux.GetVuxData(constants.GistId)
    let autoSync = vux.GetVuxData(constants.AutoSync)
    let accessToken = vux.GetVuxData(constants.AccessToken)
    fs.writeFile(constants.UserDataFile, JSON.stringify({
        Files: files,
        CurTab: curTab,
        OnlyShowContentDate: onlyShowContentDate,
        [constants.AutoSync]: autoSync,
        [constants.GistId]: gistId,
        [constants.AccessToken]: accessToken
    }), err => {
        if (err) {
            util.ShowError(`${err} in SaveUserDataFile!`)
        }
    })
    console.log('autoSync' + autoSync)
    if (autoSync) {
        // update gist
        console.log('debounce')
        uploadGist()
    }
}

export function SaveMarkdownFile() {
    let curTab = vux.GetVuxData(constants.CurTab)
    let tabsData = vux.GetVuxData(constants.TabsData)
    let filename = tabsData[curTab].FileName
    let content = tabsData[curTab].Content
    let autoSync = vux.GetVuxData(constants.AutoSync)
    fs.writeFile(filename, markdownParser.convertObjToMarkDown(content, filename), err => {
        if (err) {
            util.ShowError(`${err} in SaveMarkdownFile!`)
        }
    })
    console.log('autoSync' + autoSync)
    if (autoSync) {
        // update gist
        console.log('debounce')
        uploadGist()
    }
}

function getLocalFiles() {
    let filePaths = vux.GetVuxData(constants.Files)
    filePaths.push(constants.UserDataFile)
    let localFiles = {}
    for (let filePath of filePaths) {
        localFiles[filePath] = {
            content: fs.readFileSync(filePath, { encoding: 'utf8' })
        }
    }
    // add settings
    return localFiles
}

// function getGist(accessToken) {
//     // find whole gist list or search by gist id
//     let localFiles = getLocalFiles()
//     axios.get(`https://api.github.com/gists`,
//         {
//             headers: {
//                 Authorization: `token ${accessToken}`
//             }
//         }).then((response) => {
//             console.log(response);
//             let gistId = null
//             for (let curGist of response.data) {
//                 if (curGist.description === constants.GistDescription) {
//                     gistId = curGist.id
//                 }
//             }
//             console.log(gistId);
//             if (gistId) {
//                 // means the first time running, download gist data to local
//                 vux.SetVuxData(gistId, constants.GistId)
//                 downloadGist(accessToken, gistId)
//             } else {
//                 // doesn't find exist one, create new one and upload local files
//                 uploadGist(accessToken)
//             }
//         }).catch((error) => {
//             console.log(error);
//         });
// }

// function createGist(localFiles, authorization) {
//     axios.post(`https://api.github.com/gists`,
//         {
//             files: localFiles,
//             description: constants.GistDescription
//         },
//         {
//             headers: {
//                 Authorization: authorization
//             }
//         }).then((response) => {
//             console.log(response);
//             vux.SetVuxData(response.data.id, constants.GistId)
//             SaveUserDataFile()
//         }).catch((error) => {
//             console.log(error);
//         });
// }

function checkParas(cb) {
    const localFiles = getLocalFiles()
    const gistId = vux.GetVuxData(constants.GistId)
    const accessToken = vux.GetVuxData(constants.AccessToken)
    const authorization = `token ${accessToken}`
    if (!accessToken) {
        vux.SetVuxData(true, constants.LoginDialogVisible)
        return
    }
    if (!gistId) {
        axios.get(`https://api.github.com/gists`,
            {
                headers: {
                    Authorization: authorization
                }
            }).then((response) => {
                console.log(response);
                let gistId = null
                for (let curGist of response.data) {
                    if (curGist.description === constants.GistDescription) {
                        gistId = curGist.id
                    }
                }
                console.log(gistId);
                if (gistId) {
                    // means the first time running, download gist data to local
                    vux.SetVuxData(gistId, constants.GistId)
                    cb(localFiles, authorization, gistId)
                } else {
                    // doesn't find exist one, create new one and upload local files
                    axios.post(`https://api.github.com/gists`,
                        {
                            files: localFiles,
                            description: constants.GistDescription
                        },
                        {
                            headers: {
                                Authorization: authorization
                            }
                        }).then((response) => {
                            console.log(response);
                            vux.SetVuxData(response.data.id, constants.GistId)
                            SaveUserDataFile()
                        }).catch((error) => {
                            console.log(error);
                        });
                }
            }).catch((error) => {
                console.log(error);
            });
    } else {
        cb(localFiles, authorization, gistId)
    }
}

// export function SyncData(option) {
//     // check whether authed
//     let accessToken = vux.GetVuxData(constants.AccessToken)
//     if (accessToken) {
//         // query gist and sync the newest files
//         const authorization = `token ${accessToken}`
//         let localFiles = getLocalFiles()
//         if (option === constants.Upload) {
//             uploadGist(localFiles, authorization)
//         } else if (option === constants.Download) {
//             downloadGist(authorization)
//         }
//     } else {
//         // new users
//         // popup login dialog
//         vux.SetVuxData(true, constants.LoginDialogVisible)
//     }
//     // let curVersion = packageConfig.version
//     // let authUri = `https://api.github.com/authorizations`
//     // let lastestVersionUri = "https://github.com/zjulyx/Markdown-Todo-List/releases/latest"
//     // axios.post(versionAPIUri)
//     //     .then((response) => {
//     //         let serverVersion = response.data.tag_name.substr(1); // remove prefix 'v'
//     //         if (serverVersion > curVersion) {
//     //             this.$notify({
//     //                 title: 'Update Available',
//     //                 dangerouslyUseHTMLString: true,
//     //                 message: `Find new version ${serverVersion}, click <a href="#">here</a> to download`,
//     //                 duration: 0,
//     //                 onClick() {
//     //                     // may need use different cmd in different os
//     //                     exec(`start ${lastestVersionUri}`)
//     //                 }
//     //             });
//     //         }
//     //     })
//     //     .catch((error) => {
//     //         this.$message({
//     //             showClose: true,
//     //             duration: 0,
//     //             message: `Find error ${error} in sync process`,
//     //             type: 'warning'
//     //         });
//     //     });
// }
