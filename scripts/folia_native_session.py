"""Read only public macOS session flags; never return account identifiers."""
import ctypes
import plistlib

_cg = ctypes.CDLL('/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics')
_cf = ctypes.CDLL('/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation')
_cg.CGSessionCopyCurrentDictionary.restype = ctypes.c_void_p
_cf.CFPropertyListCreateData.argtypes = [
    ctypes.c_void_p, ctypes.c_void_p, ctypes.c_long, ctypes.c_ulong, ctypes.c_void_p
]
_cf.CFPropertyListCreateData.restype = ctypes.c_void_p
_cf.CFDataGetLength.argtypes = [ctypes.c_void_p]
_cf.CFDataGetLength.restype = ctypes.c_long
_cf.CFDataGetBytePtr.argtypes = [ctypes.c_void_p]
_cf.CFDataGetBytePtr.restype = ctypes.c_void_p
_cf.CFRelease.argtypes = [ctypes.c_void_p]


def native_session():
    session = _cg.CGSessionCopyCurrentDictionary()
    if not session:
        raise ValueError('Native console session is unavailable')
    data = None
    try:
        data = _cf.CFPropertyListCreateData(None, session, 100, 0, None)
        if not data:
            raise ValueError('Native console session cannot be read')
        state = plistlib.loads(
            ctypes.string_at(_cf.CFDataGetBytePtr(data), _cf.CFDataGetLength(data))
        )
        return {
            'screenLocked': state.get('CGSSessionScreenIsLocked', False) is True,
            'onConsole': state.get('kCGSSessionOnConsoleKey') is True,
            'loginDone': state.get('kCGSessionLoginDoneKey') is True,
        }
    finally:
        if data:
            _cf.CFRelease(data)
        _cf.CFRelease(session)


def interactive_session(state):
    return state['onConsole'] and state['loginDone'] and not state['screenLocked']
