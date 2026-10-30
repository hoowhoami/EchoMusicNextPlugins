// Folia a8da4437 Nomand: five original Paper shaders, static image and bounded GPU surfaces.
pragma ComponentBehavior: Bound
import QtQuick
import EchoMusic.PluginSdk
import "kernel.mjs" as Kernel

Item {
    id: root
    objectName: "foliaNomandBackground"
    property var settings: ({})
    property url coverUrl
    property url backgroundImageUrl
    property EchoPluginAssets assetsService: null
    property color backgroundColor: "#181e28"
    property color primaryColor: "#efeadd"
    property color secondaryColor: "#4d6877"
    property color accentColor: "#cc3366"
    property bool dark: true
    property bool live: true
    property bool paused: false
    property bool motionEnabled: true
    property int colorBlendMs: 0
    readonly property var tuning: Kernel.tuning(settings)
    readonly property url sourceUrl: Kernel.resolveSourceUrl(String(coverUrl), String(backgroundImageUrl), tuning) || ""
    readonly property var profile: Kernel.profile(tuning, {
        backgroundColor: rgba(backgroundColor),
        primaryColor: rgba(primaryColor),
        secondaryColor: rgba(secondaryColor),
        accentColor: rgba(accentColor)
    }, !dark, String(sourceUrl))
    readonly property var physicalBudget: Kernel.pixelBudget(width, height, Screen.devicePixelRatio)
    readonly property size physicalSize: Qt.size(physicalBudget.width, physicalBudget.height)
    readonly property bool sizeAccepted: physicalSize.width <= 16384 && physicalSize.height <= 16384
    readonly property var renderer: content.item
    readonly property bool sourceTextureMipmap: !!profile.mipmaps
    readonly property bool renderReady: !!renderer && renderer.ready
    readonly property string errorString: !sizeAccepted ? qsTr("背景图片尺寸超出绘制预算") : renderer ? renderer.errorString : ""
    // RGBA8 texture plan, including full mip chain; excludes decoder/driver/framework memory.
    readonly property real cacheBytes: renderer ? renderer.cacheBytes : 0
    function rgba(color) {
        return [color.r, color.g, color.b, color.a];
    }
    clip: true
    Rectangle {
        anchors.fill: parent
        color: root.backgroundColor
    }
    Loader {
        id: content
        anchors.fill: parent
        active: root.live && root.visible && root.width > 0 && root.height > 0 && !!root.sourceUrl && root.sizeAccepted
        sourceComponent: Item {
            id: scene
            // Cached QSB instances can remain Uncompiled while drawing successfully.
            readonly property var statuses: [image.status, shader.status, straight.status, present.status, image.implicitWidth, image.implicitHeight]
            readonly property bool ready: image.status === Image.Ready && !errorString
            readonly property string errorString: image.status === Image.Error ? qsTr("背景图片读取失败") : shader.status === ShaderEffect.Error ? shader.log : straight.status === ShaderEffect.Error ? straight.log : present.status === ShaderEffect.Error ? present.log : ""
            readonly property size sourcePixels: image.sourceSize
            readonly property real decodeScale: Math.min(1, 4096 / Math.max(1, image.implicitWidth), 4096 / Math.max(1, image.implicitHeight))
            readonly property int imageWidth: Math.max(1, Math.round(image.implicitWidth * decodeScale))
            readonly property int imageHeight: Math.max(1, Math.round(image.implicitHeight * decodeScale))
            readonly property real cacheBytes: image.status !== Image.Ready ? 0 : imageWidth * imageHeight * 4 + textureBytes(imageWidth, imageHeight, root.sourceTextureMipmap) + root.physicalSize.width * root.physicalSize.height * 4 + 128 * 128 * 4
            function textureBytes(w, h, mips) {
                let bytes = w * h * 4;
                if (mips)
                    while (w > 1 || h > 1) {
                        w = Math.max(1, Math.floor(w / 2));
                        h = Math.max(1, Math.floor(h / 2));
                        bytes += w * h * 4;
                    }
                return bytes;
            }
            Image {
                id: image
                objectName: "nomandStaticImage"
                visible: false
                source: root.sourceUrl
                asynchronous: true
                cache: false
                autoTransform: true
                retainWhileLoading: false
                sourceSize: Qt.size(4096, 4096)
                fillMode: Image.Stretch
            }
            Image {
                id: noise
                source: "paper-noise.png"
                visible: false
                cache: true
                smooth: true
            }
            // Paper uploads straight RGBA and then generates mipmaps. Unpremultiply
            // before the mip chain so translucent source pixels keep that order.
            ShaderEffect {
                id: straight
                width: scene.imageWidth
                height: scene.imageHeight
                property var source: image
                blending: false
                fragmentShader: "straight.frag.qsb"
            }
            ShaderEffectSource {
                id: imageTexture
                visible: false
                sourceItem: straight
                hideSource: true
                live: root.live && root.visible
                textureSize: Qt.size(scene.imageWidth, scene.imageHeight)
                smooth: true
                mipmap: root.sourceTextureMipmap
            }
            // Keep image.vert's WebGL raster orientation through this FBO;
            // copy.frag restores Qt's displayed orientation after implicit LOD.
            NomandShader {
                id: shader
                anchors.fill: parent
                visible: image.status === Image.Ready
                profile: root.profile
                u_resolution: Qt.vector2d(root.physicalSize.width, root.physicalSize.height)
                u_pixelRatio: root.physicalBudget.pixelRatio
                u_imageAspectRatio: scene.imageWidth / scene.imageHeight
                u_image: imageTexture
                u_noiseTexture: noise
                blending: false
            }
            ShaderEffectSource {
                id: result
                sourceItem: shader
                hideSource: true
                visible: false
                live: root.live && root.visible
                textureSize: root.physicalSize
                smooth: true
            }
            ShaderEffect {
                id: present
                anchors.fill: parent
                visible: image.status === Image.Ready
                property var source: result
                fragmentShader: "copy.frag.qsb"
            }
        }
    }
    Rectangle {
        anchors.fill: parent
        color: root.backgroundColor
        opacity: root.tuning.overlayOpacity
        visible: !!root.sourceUrl && root.tuning.overlayEnabled
    }
}
