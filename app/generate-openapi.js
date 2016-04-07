'use strict'

const fs = require('fs')
const path = require('path')

const mkdirp = require('mkdirp')

const jsonRefs = require('json-refs')
const jsonPath = require('jsonpath')

const defaultOut = path.resolve(__dirname, '../dist/mondo-openapi.json')
const out = process.argv[2] ? path.resolve(process.argv[2]) : defaultOut
const outdir = path.dirname(out)

jsonPath.pathparents = function (obj, path, ancestors) {
  ancestors = ancestors || 1
  const paths = jsonPath.paths(obj, path)
  const parentsPath = paths.map(chunks => {
    chunks.length = chunks.length - ancestors
    return jsonPath.stringify(chunks)
  }).filter((chunk, pos, arr) => {
    return arr.indexOf(chunk) === pos
  })
  return parentsPath
}

jsonPath.parents = function (obj, path, ancestors) {
  const parentsPath = jsonPath.pathparents(obj, path, ancestors)
  const parents = parentsPath.map(parentPath => {
    return jsonPath.query(obj, parentPath)
  })
  return parents
}

jsonPath.applyparents = function (obj, path, fn, ancestors) {
  const parentsPath = jsonPath.pathparents(obj, path, ancestors)
  const parentsApplied = parentsPath.map(parentPath => {
    return jsonPath.apply(obj, parentPath, fn)
  })
  return parentsApplied
}

jsonRefs.resolveRefsAt(path.resolve(__dirname, '../src/mondo.json'))
  .then(function (res) {
    function resolveAllOf (targetObj) {
      if (!targetObj) {
        return
      }
      if (!targetObj.allOf) {
        return targetObj
      }
      let obj = {}
      const allOf = targetObj.allOf
      while (allOf.length) {
        const nextObj = allOf.shift()
        obj = Object.assign(obj, nextObj)
      }
      return obj
    }

    jsonPath.applyparents(res.resolved, '$..allOf', resolveAllOf)
    const surplus = [
      'responses',
      'definitions',
      'parameters'
    ]
    surplus.forEach(surprop => {
      delete res.resolved[surprop]
    })

    mkdirp(outdir, (err) => {
      if (err) {
        console.error(err)
      }
      fs.writeFile(out, JSON.stringify(res.resolved, null, 2), (err) => {
        if (err) {
          console.err(err)
        } else {
          console.log('Generated', out)
        }
      })
    })
  })
  .catch(function (err) {
    console.error(err)
  })
