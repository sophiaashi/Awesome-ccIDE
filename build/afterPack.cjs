// electron-builder afterPack hook
// 在打包后、签名前彻底移除 Info.plist 里所有 NS*UsageDescription key
// 避免 macOS TCC 因 plist 存在这些 key 而弹出权限请求弹窗
// (空字符串不够 — key 存在本身就会触发，必须 Delete)

const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const plistPath = path.join(
    context.appOutDir,
    `${appName}.app`,
    'Contents',
    'Info.plist',
  )

  const keysToRemove = [
    'NSAppleMusicUsageDescription',
    'NSAudioCaptureUsageDescription',
    'NSBluetoothAlwaysUsageDescription',
    'NSBluetoothPeripheralUsageDescription',
    'NSCalendarsUsageDescription',
    'NSCameraUsageDescription',
    'NSContactsUsageDescription',
    'NSLocationUsageDescription',
    'NSMicrophoneUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSRemindersUsageDescription',
    'NSDesktopFolderUsageDescription',
    'NSDocumentsFolderUsageDescription',
    'NSDownloadsFolderUsageDescription',
    'NSRemovableVolumesUsageDescription',
    'NSNetworkVolumesUsageDescription',
    'NSAppleEventsUsageDescription',
    'NSSystemAdministrationUsageDescription',
    'NSFocusStatusUsageDescription',
    'NSMotionUsageDescription',
    'NSSpeechRecognitionUsageDescription',
    'NSHomeKitUsageDescription',
    'NSHealthShareUsageDescription',
    'NSHealthUpdateUsageDescription',
    'NSSiriUsageDescription',
    'NSFaceIDUsageDescription',
  ]

  let removed = 0
  for (const key of keysToRemove) {
    try {
      execSync(
        `/usr/libexec/PlistBuddy -c "Delete :${key}" "${plistPath}"`,
        { stdio: 'ignore' },
      )
      removed++
    } catch {
      // key 不存在就跳过
    }
  }

  console.log(`[afterPack] Removed ${removed} UsageDescription keys from Info.plist`)
}
