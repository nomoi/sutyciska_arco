# galfi lo jbovlaste datni lo jbotci datni

import xml.etree.ElementTree as etree
import json
import os
import re

import argparse
parser = argparse.ArgumentParser()
parser.add_argument('path', help='path to jbovlaste XML file')
parser.add_argument('-o', '--output', default='.', help='path to output')
args = parser.parse_args()

root = etree.parse(os.path.expanduser(args.path)).getroot()
data = {} # full dictionary
rafsi2gismu = {} # rafsi to gismu mapping

def convert_glosses(found):
    return [x.attrib for x in found]

for xml_el in root[0]:
    word = xml_el.attrib["word"]

    if word in data: # already an entry
        print("format: duplicate entry for:", word)
        continue

    definition = xml_el.find("definition")
    notes = xml_el.find("notes")
    word_type = xml_el.attrib["type"]

    json_el = {}

    if definition == None or definition.text == None:
        print("format: skipping no-definition:", word)
        continue
    
    json_el["word"] = word
    json_el["type"] = word_type
    json_el["definition"] = definition.text

    if notes != None:
        json_el["notes"] = notes.text

    if word_type == "cmavo":
        selmaho = xml_el.find("selmaho")
        if selmaho is not None:
            json_el["selmaho"] = selmaho.text
        else:
            print("missing selmaho:", word)

    if word_type == "gismu":
        rafsi2gismu[word] = word
        rafsi2gismu[word[:4]] = word
    all_xml_rafsi = xml_el.findall("rafsi")
    if len(all_xml_rafsi) > 0:
        json_el["rafsi"] = []
        if word_type == "gismu":
            json_el["rafsi"] = [word[:4]]
        for r in all_xml_rafsi:
            rafsi2gismu[r.text] = word
            json_el["rafsi"].append(r.text)

    glosses = convert_glosses(xml_el.findall("glossword"))

    if len(glosses) > 0:
        json_el["glosses"] = glosses

    data[word] = json_el

with open(os.path.expanduser(os.path.join(args.output, 'jbovlaste.json')), 'w') as f:
    json.dump(data, f) 

with open(os.path.expanduser(os.path.join(args.output, 'rafsi2gismu.json')), 'w') as f:
    json.dump(rafsi2gismu, f) 

with open("jbovlaste.json", "w") as f:
    json.dump(data, f, indent=4, sort_keys=True) 

with open("rafsi2gismu.json", "w") as f:
    json.dump(rafsi2gismu, f, indent=4, sort_keys=True) 
