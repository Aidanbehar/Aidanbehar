"""Minimal NBT (Named Binary Tag) reader/writer for Minecraft structure files.

Values are represented with small wrapper types so the writer knows which tag to emit:
Byte, Short, Int, Long, Float, Double, String (str), List (TagList), Compound (dict),
IntArray, LongArray, ByteArray.
"""
import gzip
import struct


class Byte(int): pass
class Short(int): pass
class Int(int): pass
class Long(int): pass
class Float(float): pass
class Double(float): pass
class IntArray(list): pass
class LongArray(list): pass
class ByteArray(list): pass


class TagList(list):
    def __init__(self, tag_type, items=()):
        super().__init__(items)
        self.tag_type = tag_type


END, BYTE, SHORT, INT, LONG, FLOAT, DOUBLE, BYTE_ARRAY, STRING, LIST, COMPOUND, INT_ARRAY, LONG_ARRAY = range(13)


class _Reader:
    def __init__(self, data):
        self.d = data
        self.i = 0

    def take(self, n):
        b = self.d[self.i:self.i + n]
        self.i += n
        return b

    def u(self, fmt):
        size = struct.calcsize(fmt)
        return struct.unpack(">" + fmt, self.take(size))[0]

    def string(self):
        n = self.u("H")
        return self.take(n).decode("utf-8")

    def payload(self, t):
        if t == BYTE: return Byte(self.u("b"))
        if t == SHORT: return Short(self.u("h"))
        if t == INT: return Int(self.u("i"))
        if t == LONG: return Long(self.u("q"))
        if t == FLOAT: return Float(self.u("f"))
        if t == DOUBLE: return Double(self.u("d"))
        if t == BYTE_ARRAY: return ByteArray(self.u("b") for _ in range(self.u("i")))
        if t == STRING: return self.string()
        if t == LIST:
            et = self.u("b")
            n = self.u("i")
            return TagList(et, [self.payload(et) for _ in range(n)])
        if t == COMPOUND:
            out = {}
            while True:
                tt = self.u("b")
                if tt == END:
                    return out
                name = self.string()
                out[name] = self.payload(tt)
        if t == INT_ARRAY: return IntArray(self.u("i") for _ in range(self.u("i")))
        if t == LONG_ARRAY: return LongArray(self.u("q") for _ in range(self.u("i")))
        raise ValueError(t)


def read(path):
    data = gzip.open(path).read()
    r = _Reader(data)
    t = r.u("b")
    r.string()
    return r.payload(t)


def _type_of(v):
    if isinstance(v, Byte): return BYTE
    if isinstance(v, Short): return SHORT
    if isinstance(v, Long): return LONG
    if isinstance(v, Int) or (isinstance(v, int) and not isinstance(v, bool)): return INT
    if isinstance(v, bool): return BYTE
    if isinstance(v, Float): return FLOAT
    if isinstance(v, Double) or isinstance(v, float): return DOUBLE
    if isinstance(v, str): return STRING
    if isinstance(v, ByteArray): return BYTE_ARRAY
    if isinstance(v, IntArray): return INT_ARRAY
    if isinstance(v, LongArray): return LONG_ARRAY
    if isinstance(v, (TagList, list)): return LIST
    if isinstance(v, dict): return COMPOUND
    raise TypeError(type(v))


def _w_string(out, s):
    b = s.encode("utf-8")
    out += struct.pack(">H", len(b)) + b


def _w_payload(out, v):
    t = _type_of(v)
    if t == BYTE: out += struct.pack(">b", int(v))
    elif t == SHORT: out += struct.pack(">h", v)
    elif t == INT: out += struct.pack(">i", v)
    elif t == LONG: out += struct.pack(">q", v)
    elif t == FLOAT: out += struct.pack(">f", v)
    elif t == DOUBLE: out += struct.pack(">d", v)
    elif t == STRING: _w_string(out, v)
    elif t == BYTE_ARRAY:
        out += struct.pack(">i", len(v)) + bytes((x & 0xFF) for x in v)
    elif t == INT_ARRAY:
        out += struct.pack(">i", len(v)) + b"".join(struct.pack(">i", x) for x in v)
    elif t == LONG_ARRAY:
        out += struct.pack(">i", len(v)) + b"".join(struct.pack(">q", x) for x in v)
    elif t == LIST:
        et = v.tag_type if isinstance(v, TagList) else (_type_of(v[0]) if v else END)
        out += struct.pack(">bi", et, len(v))
        for x in v:
            _w_payload(out, x)
    elif t == COMPOUND:
        for k, x in v.items():
            out += struct.pack(">b", _type_of(x))
            _w_string(out, k)
            _w_payload(out, x)
        out += struct.pack(">b", END)


def write(path, root):
    out = bytearray()
    out += struct.pack(">b", COMPOUND)
    _w_string(out, "")
    _w_payload(out, root)
    # mtime=0 keeps the output byte-for-byte reproducible.
    with open(path, "wb") as f:
        f.write(gzip.compress(bytes(out), mtime=0))
