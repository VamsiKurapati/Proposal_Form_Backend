const fs = require('fs');

/**
 * Replace text elements in JSON using proposalData & userData
 *
 * @param {string} inputFile   Path to input JSON file
 * @param {string} outputFile  Path to output JSON file
 * @param {Object} proposalData  Data source for replacements
 * @param {Object} userData      Data source for replacements
 */

function replaceTextInJson(inputFile, outputFile, proposalData, userData) {
  // Load JSON
  const jsonData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

  // string builders
  let employee_String = userData.employees_information
    .slice(0, 5)
    .map(emp => {
      const topSkills = emp.skills.slice(0, 3).join(", ");
      return `${emp.name}\t${emp.jobTitle}\t${topSkills}`;
    }).join("\n");

  let cert_Name_String = userData.certifications
    .map(cert => cert.name)
    .join("\n\n");

  let cert_issued_String = userData.certifications
    .map(cert => cert.issuer)
    .join("\n\n\n\n");

  let cert_issued_date_String = userData.certifications
    .map(cert => cert.validTill)
    .join("\n\n\n\n");

  const awards_firstHalf = userData.awards.slice(0, 3).join("\n\n\n");
  const awards_secondHalf = userData.awards.length > 3 ? userData.awards.slice(3).join("\n\n\n") : "";

  let projectsString = userData.pastProjects.map(p => p.name).join("\n");
  let caseStudiesString = userData.caseStudies.map(c => c.Title).join("\n");

  // Define text to update by element ID
  const idTextMap = {
    //pag1
    "rlx5jtd14": proposalData["rfpTitle"],
    "sfb0qxhzo": userData.companyName,
    "vago46ljn": Date.now(),
    "m5qkm5m02": userData.companyName,
    //page2

    //page3
    "ey5rdjrpw": proposalData["Executive Summary"],
    "xrit30mp9": userData.companyName,
    "cocneu56a": Date.now(),
    //page4
    "beilqsb7k": userData.companyName,
    "sh2ifubk0": Date.now(),
    "8zb1waflu": proposalData["Objectives"],
    //page5
    "fmpd5e7qi": userData.companyName,
    "qsj9au3d8": Date.now(),
    "bwy6ho5te": proposalData["Proposed Approach / Solution Overview"],
    //page6
    "3h57bpwnh": proposalData["Scope of Work / Deliverables"],
    "8po2nlzuh": userData.companyName,
    "g2bo7ys9z": Date.now(),
    //page7
    "fd7t5hou7": userData.companyName,
    "53zsrta3v": Date.now(),
    "2ruh3ec4z": proposalData["Tech Stack & Project Plan"],
    //page8
    "yo156zvu3": userData.companyName,
    "lr1c9gw6d": Date.now(),
    "1r85l9bw5": proposalData["Timeline & Milestones"],
    //page9
    "zjwlb70va": userData.companyName,
    "c8e7ksbzz": Date.now(),
    "pmi8nres2": proposalData["Risk Assessment & Mitigation Plan"],
    //page10
    "ohqxh4r0c": userData.companyName,
    "apgpwrh1v": Date.now(),
    "fth8r5bzi": proposalData["Budget & Cost Breakdown"],
    //page11
    "guzx7j4ra": userData.companyName,
    "yveh3f5ht": Date.now(),
    "m5sbuvhgn": userData.employeeCount,
    "87jwib1lv": employee_String,
    //page12
    "tiritxrrf": userData.companyName,
    "3na97c7np": Date.now(),
    "qp5qzzi4m": cert_Name_String,
    "6sggav3zl": cert_issued_date_String,
    "smswn49o8": cert_issued_String,
    "m8yrx1jp1": awards_firstHalf,
    "qofivgdvq": awards_secondHalf,
    //page13
    "zvzob8s2j": userData.companyName,
    "1uyfqg2v1": Date.now(),
    "kdg64n2jr": caseStudiesString,
    "h3qe3fk8h": projectsString,
    //page14
    "9itfenprm": userData.companyName,
    "3g8mptmsg": Date.now(),
    "e4si4fftk": proposalData["Partnership Overview"],
    //page15
    "edcrgtn4p": userData.companyName,
    "eguv75xvt": Date.now(),
    "o6xovc8aq": proposalData["References & Proven Results"],
    //page16
    "6yy6weiwc": userData.companyName,
    "szpfj3eaf": Date.now(),
    "fbl5jusz0": proposalData["Value Proposition / Why Us?"],
    //page17
    "vrywa3v5e": userData.companyName,
    "mnj4v52l4": Date.now(),
    //page18
    "9xkyniqyb": userData.companyName,
    "c7g4djs3s": Date.now(),
    "fc92cy58t": userData.companyName,
    "dygbwlocr": userData.email,
    "aqmqb0fzi": userData.website,
  };

  // Function to replace text by ID
  function replaceTextById(data, idTextMap) {
    data.pages?.forEach((page) => {
      page.elements?.forEach((element) => {
        if (element.type === "text" && element.id && idTextMap[element.id]) {
          element.properties = element.properties || {};
          element.properties.text = idTextMap[element.id]; // replace text
        }
      });
    });
    return data;
  }

  // Apply replacements
  const updatedJson = replaceTextById(jsonData, idTextMap);

  // Save modified file
  fs.writeFileSync(outputFile, JSON.stringify(updatedJson, null, 2), 'utf8');
  console.log(`Updated JSON written to ${outputFile}`);

}

module.exports = { replaceTextInJson };
