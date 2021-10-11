import fs from 'fs-extra';
import _ from 'lodash';
import shortid from 'shortid';

const schemioExtension = '.schemio.json';


function isValidCharCode(code) {
    return (code >= 48 && code <= 57) 
        || (code >= 65 && code <= 90)
        || (code >= 97 && code <= 122)
        || code === 32
        || (code >= 39 && code <= 46);
}

function validateFileName(name) {
    name = name.trim();
    if (name.length === 0) {
        return false;
    }
    for (let i = 0; i < name.length; i++) {
        if (!isValidCharCode(name.charCodeAt(i))) {
            return false;
        }
    }
    return true;
}

function safePath(path) {
    if (!path) {
        path = '.';
    }
    path = path.replace(/\/\.\.\//g, '/./');
    return path;
}

export function fsGetScheme(config) {
    return (req, res) => {
        const path = safePath(req.query.path);
        let schemeId = req.query.id;
        if (!schemeId) {
            schemeId = '';
        }

        schemeId = schemeId.replace(/\//g, '');
        if (schemeId.length === 0) {
            res.status(400);
            res.json({
                error: 'BAD_REQUEST',
                message: 'Invalid request'
            })
            return;
        }

        const realPath = config.fs.rootPath + path;
        const fullPath = realPath + '/' + schemeId + schemioExtension;
        
        fs.readFile(fullPath, 'utf-8').then(content => {
            res.json(JSON.parse(content));
        })
        .catch(err => {
            console.error('Failed to read scheme file', fullPath, err);
            res.status(500);
            res.json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create scheme'
            });
        })
    };
}

export function fsSaveScheme(config) {
    return (req, res) => {
        const path = safePath(req.query.path);
        let schemeId = req.query.id;
        if (!schemeId) {
            schemeId = '';
        }

        schemeId = schemeId.replace(/\//g, '');
        if (schemeId.length === 0) {
            res.status(400);
            res.json({
                error: 'BAD_REQUEST',
                message: 'Invalid request'
            })
            return;
        }


        const realPath = config.fs.rootPath + path;
        const fullPath = realPath + '/' + schemeId + schemioExtension;

        const scheme = req.body;
        scheme.id = path + '/' + scheme.name + schemioExtension;
        scheme.path = path;

        fs.stat(fullPath)
        .then(stat => {
            if (!stat.isFile()) {
                return Promise.reject();
            }
            return fs.writeFile(fullPath, JSON.stringify(scheme));
        })
        .then(() => {
            res.json(scheme);
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create scheme'
            });
        });
    };
}

export function fsCreateScheme(config) {
    return (req, res) => {
        const path = safePath(req.query.path);
        const realPath = config.fs.rootPath + path;
        
        const scheme = req.body;

        if (!validateFileName(scheme.name)) {
            res.status(400);
            res.json({
                error: 'BAD_REQUEST',
                message: 'Invalid request'
            });
            return;
        }
        const id = shortid.generate();
        const fullPath = realPath + '/' + id + schemioExtension;
        scheme.id = id;
        scheme.path = path;

        fs.writeFile(fullPath, JSON.stringify(scheme)).then(() => {
            res.json(scheme);
        })
        .catch(err => {
            res.status(500);
            res.json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create scheme'
            });
        })
    };
}

export function fsCreateDirectory(config) {
    return (req, res) => {
        const dirBody = req.body;
        if (!validateFileName(dirBody.name)) {
            res.status(400);
            res.json({
                error: 'BAD_REQUEST',
                message: 'Invalid request'
            })
        }

        const path = safePath(dirBody.path);

        const realPath = config.fs.rootPath + path + '/' + dirBody.name;

        let entryPath = path + '/';
        if (entryPath === './') {
            entryPath = '';
        }
        fs.mkdir(realPath).then(() => {
            res.json({
                kind: 'dir',
                name: dirBody.name,
                path: entryPath + dirBody.name
            });
        })
        .catch(err => {
            res.status(500);
            res.json({
                error: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create directory'
            });
        });
    };
}


export function fsListFilesRoute(config) {
    return (req, res) => {
        const path = safePath(req.query.path);
        const realPath = config.fs.rootPath + path;

        fs.readdir(realPath).then(files => {
            
            const entries = [];

            _.forEach(files, file => {
                const stat = fs.statSync(`${realPath}/${file}`);

                let entryPath = path + '/';
                if (entryPath === './') {
                    entryPath = '';
                }
                if (stat.isDirectory()) {
                    entries.push({
                        kind: 'dir',
                        name: file,
                        path: entryPath + file
                    });
                } else if (file.endsWith(schemioExtension)) {
                    try {
                        const content = fs.readFileSync(`${realPath}/${file}`, 'utf-8');
                        const scheme = JSON.parse(content);

                        entries.push({
                            kind: 'scheme',
                            id: file.substring(0, file.length - schemioExtension.length),
                            name: scheme.name,
                            path: entryPath
                        });
                    } catch(err) {
                        console.error('Failed to parse scheme file', entryPath, err);
                    }
                }
            });

            if (path !== '.') {
                const pathDirs = path.split('/');
                if (pathDirs.length === 0) {
                    entries.splice(0, 0, {
                        kind: 'dir',
                        name: '..',
                        path: '.'
                    });
                } else {
                    pathDirs.pop();
                    entries.splice(0, 0, {
                        kind: 'dir',
                        name: '..',
                        path: pathDirs.join('/')
                    });
                }
            }
            res.json({
                path: path,
                entries 
            });
        }).catch(err => {
            console.error('Could not find files in ', path, err);
            res.status = 404;
            res.json({error: 'NOT_FOUND'});
        });
    }
}