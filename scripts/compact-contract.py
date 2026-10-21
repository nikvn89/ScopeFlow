"""Build a small, auditable Studio deployment from the readable contract.

Only identifiers internal to ScopeGuard and lexical whitespace are compacted.
The reverse name transform must reproduce the exact original Python AST,
including annotations, public argument names and semantic prompt literals.
No eval, compression loader or new runtime dependency is used.
"""
import ast
import builtins
import io
import json
from pathlib import Path
import sys
import tokenize

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'contracts/ScopeFlow.py'
TARGET = ROOT / 'deploy/ScopeFlow.py'


def internal_names(tree):
    cls = next(c for c in tree.body if isinstance(c, ast.ClassDef) and c.name == 'ScopeGuard')
    members = []
    for item in cls.body:
        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
            members.append(item.target.id)
        elif isinstance(item, ast.Assign):
            members.extend(t.id for t in item.targets if isinstance(t, ast.Name))
    helpers = [f.name for f in cls.body if isinstance(f, ast.FunctionDef) and f.name.startswith('_') and f.name not in ('__init__', '_replace_reserved_tokens')]
    protected = {'self'} | set(dir(builtins)) | set(members)
    for f in cls.body:
        if isinstance(f, ast.FunctionDef) and not f.name.startswith('_'):
            protected.update(a.arg for a in f.args.posonlyargs + f.args.args + f.args.kwonlyargs)
    # Do not alter module globals/imports or nested function names.
    for node in tree.body:
        if isinstance(node, ast.Assign):
            protected.update(t.id for t in node.targets if isinstance(t, ast.Name))
        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
            protected.add(node.name)
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            protected.update(a.asname or a.name for a in node.names)
    locals_ = set()
    for f in cls.body:
        if not isinstance(f, ast.FunctionDef):
            continue
        for node in ast.walk(f):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                locals_.add(node.id)
            elif isinstance(node, ast.arg):
                locals_.add(node.arg)
            elif isinstance(node, ast.FunctionDef):
                protected.add(node.name)
    locals_ = sorted(n for n in locals_ if n not in protected and len(n) > 4)
    member_map = {name: 's' + str(i) for i, name in enumerate(members)}
    member_map.update({name: '_h' + str(i) for i, name in enumerate(helpers)})
    local_map = {name: 'v' + str(i) for i, name in enumerate(locals_)}
    originals = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    assert not originals.intersection(set(member_map.values()) | set(local_map.values())), 'Name collision'
    return member_map, local_map


class Rename(ast.NodeTransformer):
    def __init__(self, members, locals_):
        self.members = members
        self.locals = locals_

    def visit_Attribute(self, node):
        self.generic_visit(node)
        if isinstance(node.value, ast.Name) and node.value.id == 'self':
            node.attr = self.members.get(node.attr, node.attr)
        return node

    def visit_Name(self, node):
        node.id = self.locals.get(node.id, node.id)
        return node

    def visit_arg(self, node):
        self.generic_visit(node)
        node.arg = self.locals.get(node.arg, node.arg)
        return node

    def visit_Call(self, node):
        # Remember original helper identity before recursively renaming it.
        own = isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name) and node.func.value.id == 'self'
        self.generic_visit(node)
        if own:
            for keyword in node.keywords:
                keyword.arg = self.locals.get(keyword.arg, keyword.arg)
        return node

    def visit_ClassDef(self, node):
        if node.name != 'ScopeGuard':
            return node
        self.generic_visit(node)
        for item in node.body:
            if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                item.target.id = self.members.get(item.target.id, item.target.id)
            elif isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        target.id = self.members.get(target.id, target.id)
            elif isinstance(item, ast.FunctionDef):
                item.name = self.members.get(item.name, item.name)
        return node


def atoms(source):
    # Python 3.12 exposes f-string internals as tokens. Keep their source span
    # verbatim, so quotes, doubled braces and prompt whitespace never change.
    tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
    lines = source.splitlines(keepends=True)
    offsets = [0]
    for line in lines:
        offsets.append(offsets[-1] + len(line))
    def offset(pos):
        return offsets[pos[0] - 1] + pos[1]
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.type == getattr(tokenize, 'FSTRING_START', -1):
            depth = 1
            end = i + 1
            while depth:
                if tokens[end].type == tokenize.FSTRING_START:
                    depth += 1
                elif tokens[end].type == tokenize.FSTRING_END:
                    depth -= 1
                end += 1
            last = tokens[end - 1]
            yield tokenize.TokenInfo(tokenize.STRING, source[offset(token.start):offset(last.end)], token.start, last.end, token.line)
            i = end
        else:
            yield token
            i += 1


def compact_tokens(source):
    parts = []
    previous = None
    indent = 0
    beginning = True
    for token in atoms(source):
        kind = token.type
        if kind in (tokenize.ENCODING, tokenize.ENDMARKER, tokenize.COMMENT):
            continue
        if kind == tokenize.INDENT:
            indent += 1
            continue
        if kind == tokenize.DEDENT:
            indent -= 1
            continue
        if kind in (tokenize.NEWLINE, tokenize.NL):
            if not beginning:
                parts.append('\n')
            previous = None
            beginning = True
            continue
        if beginning:
            parts.append(' ' * indent)
            beginning = False
        if previous is not None:
            pair = []
            try:
                for atom in tokenize.generate_tokens(io.StringIO(previous.string + token.string).readline):
                    if atom.type not in (tokenize.NL, tokenize.NEWLINE, tokenize.ENDMARKER):
                        pair.append((atom.type, atom.string))
            except tokenize.TokenError:
                pass  # An isolated opening bracket still yields its lexical tokens.
            words = (tokenize.NAME, tokenize.NUMBER, tokenize.STRING)
            if pair != [(previous.type, previous.string), (kind, token.string)] or (previous.type in words and kind in words):
                parts.append(' ')
        parts.append(token.string)
        previous = token
    return ''.join(parts)


def build(source):
    tree = ast.parse(source)
    members, locals_ = internal_names(tree)
    transformed = Rename(members, locals_).visit(ast.parse(source))
    result = compact_tokens(ast.unparse(transformed) + '\n')
    # Preserve the exact SDK/version dependency header.
    header = '\n'.join(line for line in source.splitlines()[:4] if line.startswith('#')) + '\n'
    result = header + result
    restored = Rename({v: k for k, v in members.items()}, {v: k for k, v in locals_.items()}).visit(ast.parse(result))
    if ast.dump(tree) != ast.dump(restored):
        raise RuntimeError('Compact deployment changed the readable source AST')
    if len(result.encode()) > 48000:
        raise RuntimeError('Compact deployment exceeds the conservative source budget')
    return result


def main():
    expected = build(SOURCE.read_text())
    if '--check' in sys.argv:
        if not TARGET.exists() or TARGET.read_text() != expected:
            raise SystemExit('Deployment differs from the deterministic compact build')
    else:
        TARGET.parent.mkdir(exist_ok=True)
        TARGET.write_text(expected)
    print(json.dumps({'source_bytes': SOURCE.stat().st_size, 'deploy_bytes': len(expected.encode()), 'ast_reverse_parity': True, 'file': str(TARGET.relative_to(ROOT))}))


if __name__ == '__main__':
    main()
