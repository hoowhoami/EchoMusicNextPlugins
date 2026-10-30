// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.
var __assign = function () {
  __assign =
    Object.assign ||
    function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};
var __awaiter = function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P
      ? value
      : new P(function (resolve) {
          resolve(value);
        });
  }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator['throw'](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __generator = function (thisArg, body) {
  var t,
    _ = {
      label: 0,
      sent: function () {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: [],
    },
    f,
    y,
    g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return (
    (g.next = verb(0)),
    (g['throw'] = verb(1)),
    (g['return'] = verb(2)),
    typeof Symbol === 'function' &&
      (g[Symbol.iterator] = function () {
        return this;
      }),
    g
  );
  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError('Generator is already executing.');
    while ((g && ((g = 0), op[0] && (_ = 0)), _))
      try {
        if (
          ((f = 1),
          y &&
            (t =
              op[0] & 2
                ? y['return']
                : op[0]
                  ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                  : y.next) &&
            !(t = t.call(y, op[1])).done)
        )
          return t;
        if (((y = 0), t)) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (
              !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
              (op[0] === 6 || op[0] === 2)
            ) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var __values = function (o) {
  var s = typeof Symbol === 'function' && Symbol.iterator,
    m = s && o[s],
    i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === 'number')
    return {
      next: function () {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      },
    };
  throw new TypeError(s ? 'Object is not iterable.' : 'Symbol.iterator is not defined.');
};
function createMonetPipeline(environment, limits) {
  var _this = this;
  if (limits === void 0) {
    limits = {};
  }
  var Image = environment.Image,
    createImageBitmap = environment.createImageBitmap,
    Worker = environment.Worker,
    URL = environment.URL,
    document = environment.document;
  var released = false;
  var monetBackgroundCache = /* @__PURE__ */ new Map();
  var clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };
  var resolveSourceUrl = function (_a) {
    var _b, _c, _d;
    var coverUrl = _a.coverUrl,
      monetBackgroundImage = _a.monetBackgroundImage,
      tuning = _a.tuning;
    return tuning.backgroundSource === 'uploaded-global'
      ? (_c =
          (_b =
            monetBackgroundImage === null || monetBackgroundImage === void 0
              ? void 0
              : monetBackgroundImage.url) !== null && _b !== void 0
            ? _b
            : coverUrl) !== null && _c !== void 0
        ? _c
        : null
      : (_d =
            coverUrl !== null && coverUrl !== void 0
              ? coverUrl
              : monetBackgroundImage === null || monetBackgroundImage === void 0
                ? void 0
                : monetBackgroundImage.url) !== null && _d !== void 0
        ? _d
        : null;
  };
  var loadImage = function (src) {
    return __awaiter(_this, void 0, Promise, function () {
      var image, loadPromise, e_1;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            image = new Image();
            if (src.startsWith('http://') || src.startsWith('https://')) {
              image.crossOrigin = 'anonymous';
            }
            image.decoding = 'async';
            loadPromise = new Promise(function (resolve, reject) {
              image.onload = function () {
                return resolve();
              };
              image.onerror = function () {
                return reject(new Error('Failed to load image: '.concat(src)));
              };
            });
            image.src = src;
            _a.label = 1;
          case 1:
            _a.trys.push([1, 3, , 5]);
            return [4, image.decode()];
          case 2:
            _a.sent();
            return [3, 5];
          case 3:
            e_1 = _a.sent();
            return [4, loadPromise];
          case 4:
            _a.sent();
            return [3, 5];
          case 5:
            return [2, image];
        }
      });
    });
  };
  var getMonetBackgroundCacheKey = function (_a) {
    var _b;
    var coverUrl = _a.coverUrl,
      monetBackgroundImage = _a.monetBackgroundImage,
      theme = _a.theme,
      tuning = _a.tuning;
    return JSON.stringify({
      sourceUrl: resolveSourceUrl({ coverUrl, monetBackgroundImage, tuning }),
      uploadedId:
        tuning.backgroundSource === 'uploaded-global'
          ? (_b =
              monetBackgroundImage === null || monetBackgroundImage === void 0
                ? void 0
                : monetBackgroundImage.id) !== null && _b !== void 0
            ? _b
            : null
          : null,
      theme: {
        backgroundColor: theme.backgroundColor,
        primaryColor: theme.primaryColor,
        accentColor: theme.accentColor,
      },
      tuning: {
        backgroundSource: tuning.backgroundSource,
        backgroundBlurPx: tuning.backgroundBlurPx,
        backgroundOverlayOpacity: tuning.backgroundOverlayOpacity,
        backgroundGrayscale: tuning.backgroundGrayscale,
        backgroundSaturation: tuning.backgroundSaturation,
        backgroundWash: tuning.backgroundWash,
        backgroundWashColorMode: tuning.backgroundWashColorMode,
        backgroundWashCustomColor: tuning.backgroundWashCustomColor,
        // Drift is a DOM-side transform and never reaches the bitmap, so it stays out of the key
        // the same way backgroundLayout does; streaks are baked in and must invalidate it.
        backgroundStreaksEnabled: tuning.backgroundStreaksEnabled,
      },
    });
  };
  var isCanvasFilterSupportedCached = null;
  var checkCanvasFilterSupport = function () {
    if (typeof environment.filterSupported === 'boolean') return environment.filterSupported;
    if (isCanvasFilterSupportedCached !== null) {
      return isCanvasFilterSupportedCached;
    }
    if (typeof document === 'undefined') {
      return false;
    }
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      var ctx = canvas.getContext('2d');
      if (!ctx || typeof ctx.filter !== 'string') {
        isCanvasFilterSupportedCached = false;
        if (false) {
          console.log(
            '[MonetBackground] Canvas filter support detection: Unsupported (ctx.filter is missing)'
          );
        }
        return false;
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 2, 2);
      ctx.filter = 'blur(1px)';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
      var imgData = ctx.getImageData(1, 1, 1, 1);
      isCanvasFilterSupportedCached = imgData.data[0] > 0;
      if (false) {
        console.log(
          '[MonetBackground] Canvas filter support detection: '.concat(
            isCanvasFilterSupportedCached
              ? 'Supported (native)'
              : 'Unsupported (CSS blur fallback will be used)'
          )
        );
      }
      return isCanvasFilterSupportedCached;
    } catch (e) {
      isCanvasFilterSupportedCached = false;
      if (false) {
        console.log('[MonetBackground] Canvas filter support detection failed:', e);
      }
      return false;
    }
  };
  var painter = null;
  var lastRequestId = 0;
  var painting = null;
  var queuedPaints = [];
  var paintNext = function () {
    while (!painting && queuedPaints.length > 0) {
      var job = queuedPaints.shift();
      if (!job.wanted()) {
        job.request.image.close();
        job.settle(void 0);
        continue;
      }
      var id = (lastRequestId += 1);
      painting = __assign(__assign({}, job), { id });
      try {
        ensurePainter().postMessage(__assign(__assign({}, job.request), { id }), {
          transfer: [job.request.image],
        });
      } catch (_a) {
        painting = null;
        job.request.image.close();
        job.settle(null);
      }
    }
  };
  var finishPainting = function (picture) {
    var job = painting;
    painting = null;
    job === null || job === void 0 ? void 0 : job.settle(picture);
    paintNext();
  };
  function ensurePainter() {
    if (painter) {
      return painter;
    }
    var worker = new Worker(environment.workerUrl || 'monet-background-worker', { type: 'module' });
    worker.onmessage = function (event) {
      if (event.data.id === (painting === null || painting === void 0 ? void 0 : painting.id)) {
        finishPainting('picture' in event.data ? event.data.picture : null);
      }
    };
    worker.onerror = function () {
      worker.terminate();
      painter = null;
      finishPainting(null);
    };
    painter = worker;
    return worker;
  }
  var paintOffThread = function (request, wanted) {
    return new Promise(function (settle) {
      if (released) {
        request.image.close();
        settle(void 0);
        return;
      }
      queuedPaints.push({ request, wanted, settle });
      paintNext();
    });
  };
  var buildMonetBackgroundUrl = function (_a, wanted_1) {
    return __awaiter(_this, [_a, wanted_1], Promise, function (_b, wanted) {
      var sourceUrl, image, _c, picture, url, decoded, error_1;
      var coverUrl = _b.coverUrl,
        monetBackgroundImage = _b.monetBackgroundImage,
        theme = _b.theme,
        tuning = _b.tuning;
      return __generator(this, function (_d) {
        switch (_d.label) {
          case 0:
            sourceUrl = resolveSourceUrl({ coverUrl, monetBackgroundImage, tuning });
            if (!sourceUrl) {
              return [2, null];
            }
            _c = createImageBitmap;
            return [4, loadImage(sourceUrl)];
          case 1:
            return [4, _c.apply(void 0, [_d.sent()])];
          case 2:
            image = _d.sent();
            return [
              4,
              paintOffThread(
                {
                  image,
                  colors: {
                    backgroundColor: theme.backgroundColor,
                    primaryColor: theme.primaryColor,
                    accentColor: theme.accentColor,
                  },
                  tuning,
                  blurPx: checkCanvasFilterSupport() ? clamp(tuning.backgroundBlurPx, 0, 60) : null,
                },
                wanted
              ),
            ];
          case 3:
            picture = _d.sent();
            if (!picture) {
              return [2, picture];
            }
            url = URL.createObjectURL(picture);
            decoded = new Image();
            decoded.src = url;
            _d.label = 4;
          case 4:
            _d.trys.push([4, 6, , 7]);
            return [4, decoded.decode()];
          case 5:
            _d.sent();
            return [3, 7];
          case 6:
            error_1 = _d.sent();
            URL.revokeObjectURL(url);
            throw error_1;
          case 7:
            return [2, url];
        }
      });
    });
  };
  var wantMonetBackgroundUrl = function (options) {
    var cacheKey = getMonetBackgroundCacheKey(options);
    var entry = monetBackgroundCache.get(cacheKey);
    if (!entry) {
      var made_1 = { url: Promise.resolve(null), holders: 0 };
      var wanted = function () {
        if (made_1.holders > 0) {
          return true;
        }
        if (monetBackgroundCache.get(cacheKey) === made_1) {
          monetBackgroundCache.delete(cacheKey);
        }
        return false;
      };
      made_1.url = buildMonetBackgroundUrl(options, wanted).then(
        function (url) {
          return url !== null && url !== void 0 ? url : null;
        },
        function () {
          return null;
        }
      );
      monetBackgroundCache.set(cacheKey, made_1);
      entry = made_1;
    }
    var held = entry;
    held.holders += 1;
    var released2 = false;
    return {
      url: held.url,
      release: function () {
        if (!released2) {
          released2 = true;
          held.holders -= 1;
        }
      },
    };
  };
  var maxEntries = Number.isInteger(limits.maxEntries)
    ? Math.max(1, Math.min(32, limits.maxEntries))
    : 16;
  function prune(target) {
    monetBackgroundCache.forEach(function (entry, key) {
      if (monetBackgroundCache.size > target && entry.holders === 0) {
        monetBackgroundCache.delete(key);
        entry.url.then(function (url) {
          if (url) URL.revokeObjectURL(url);
        });
      }
    });
  }
  return {
    getMonetBackgroundCacheKey,
    checkCanvasFilterSupport,
    get cacheEntries() {
      return monetBackgroundCache.size;
    },
    wantMonetBackgroundUrl: function (options) {
      if (released) throw new Error('Monet image pipeline is released');
      var key = getMonetBackgroundCacheKey(options);
      if (!monetBackgroundCache.has(key)) {
        prune(maxEntries - 1);
        if (monetBackgroundCache.size >= maxEntries)
          throw new Error('Monet picture lease budget exceeded');
      }
      var lease = wantMonetBackgroundUrl(options);
      return {
        url: lease.url,
        release: function () {
          lease.release();
          prune(maxEntries);
        },
      };
    },
    dispose: function () {
      var e_2, _a, e_3, _b;
      if (released) return;
      released = true;
      if (painter) {
        painter.onmessage = null;
        painter.onerror = null;
        painter.terminate();
      }
      painter = null;
      if (painting) {
        painting.request.image.close();
        painting.settle(null);
        painting = null;
      }
      try {
        for (
          var queuedPaints_1 = __values(queuedPaints), queuedPaints_1_1 = queuedPaints_1.next();
          !queuedPaints_1_1.done;
          queuedPaints_1_1 = queuedPaints_1.next()
        ) {
          var job = queuedPaints_1_1.value;
          job.request.image.close();
          job.settle(void 0);
        }
      } catch (e_2_1) {
        e_2 = { error: e_2_1 };
      } finally {
        try {
          if (queuedPaints_1_1 && !queuedPaints_1_1.done && (_a = queuedPaints_1.return))
            _a.call(queuedPaints_1);
        } finally {
          if (e_2) throw e_2.error;
        }
      }
      queuedPaints.length = 0;
      try {
        for (
          var _c = __values(monetBackgroundCache.values()), _d = _c.next();
          !_d.done;
          _d = _c.next()
        ) {
          var entry = _d.value;
          entry.url.then(function (url) {
            if (url) URL.revokeObjectURL(url);
          });
        }
      } catch (e_3_1) {
        e_3 = { error: e_3_1 };
      } finally {
        try {
          if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
        } finally {
          if (e_3) throw e_3.error;
        }
      }
      monetBackgroundCache.clear();
    },
  };
}
export { createMonetPipeline };
