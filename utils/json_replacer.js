const fs = require('fs');

/**
 * Helper function to format date as DD-MM-YYYY string
 * @returns {string} Date in DD-MM-YYYY format
 */
function getFormattedDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Replace text elements in JSON using proposalData & userData
 *
 * @param {string} inputFile   Path to input JSON file
 * @param {Object} proposalData  Data source for replacements
 * @param {Object} userData      Data source for replacements
 * @returns {Object} The processed JSON data
 */

function replaceTextInJson(inputFile, proposalData, userData) {
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
    "vago46ljn": getFormattedDate(),
    "m5qkm5m02": userData.companyName,
    //page2

    //page3
    "ey5rdjrpw": proposalData["Executive Summary"],
    "xrit30mp9": userData.companyName,
    "cocneu56a": getFormattedDate(),
    //page4
    "beilqsb7k": userData.companyName,
    "sh2ifubk0": getFormattedDate(),
    "8zb1waflu": proposalData["Objectives"],
    //page5
    "fmpd5e7qi": userData.companyName,
    "qsj9au3d8": getFormattedDate(),
    "bwy6ho5te": proposalData["Proposed Approach / Solution Overview"],
    //page6
    "3h57bpwnh": proposalData["Scope of Work / Deliverables"],
    "8po2nlzuh": userData.companyName,
    "g2bo7ys9z": getFormattedDate(),
    //page7
    "fd7t5hou7": userData.companyName,
    "53zsrta3v": getFormattedDate(),
    "2ruh3ec4z": proposalData["Tech Stack & Project Plan"],
    //page8
    "yo156zvu3": userData.companyName,
    "lr1c9gw6d": getFormattedDate(),
    "1r85l9bw5": proposalData["Timeline & Milestones"],
    //page9
    "zjwlb70va": userData.companyName,
    "c8e7ksbzz": getFormattedDate(),
    "pmi8nres2": proposalData["Risk Assessment & Mitigation Plan"],
    //page10
    "ohqxh4r0c": userData.companyName,
    "apgpwrh1v": getFormattedDate(),
    "fth8r5bzi": proposalData["Budget & Cost Breakdown"],
    //page11
    "guzx7j4ra": userData.companyName,
    "yveh3f5ht": getFormattedDate(),
    "m5sbuvhgn": userData.employeeCount,
    "87jwib1lv": employee_String,
    //page12
    "tiritxrrf": userData.companyName,
    "3na97c7np": getFormattedDate(),
    "qp5qzzi4m": cert_Name_String,
    "6sggav3zl": cert_issued_date_String,
    "smswn49o8": cert_issued_String,
    "m8yrx1jp1": awards_firstHalf,
    "qofivgdvq": awards_secondHalf,
    //page13
    "zvzob8s2j": userData.companyName,
    "1uyfqg2v1": getFormattedDate(),
    "kdg64n2jr": caseStudiesString,
    "h3qe3fk8h": projectsString,
    //page14
    "9itfenprm": userData.companyName,
    "3g8mptmsg": getFormattedDate(),
    "e4si4fftk": proposalData["Partnership Overview"],
    //page15
    "edcrgtn4p": userData.companyName,
    "eguv75xvt": getFormattedDate(),
    "o6xovc8aq": proposalData["References & Proven Results"],
    //page16
    "6yy6weiwc": userData.companyName,
    "szpfj3eaf": getFormattedDate(),
    "fbl5jusz0": proposalData["Value Proposition / Why Us?"],
    //page17
    "vrywa3v5e": userData.companyName,
    "mnj4v52l4": getFormattedDate(),
    //page18
    "9xkyniqyb": userData.companyName,
    "c7g4djs3s": getFormattedDate(),
    "fc92cy58t": userData.companyName,
    "dygbwlocr": userData.email,
    "aqmqb0fzi": userData.website,
  };

  // Function to replace text by ID with safety checks 
  function replaceTextById(data, idTextMap) {
    if (!data || typeof data !== 'object') {
      console.warn('replaceTextById: Invalid data parameter');
      return data;
    }

    if (!idTextMap || typeof idTextMap !== 'object') {
      console.warn('replaceTextById: Invalid idTextMap parameter');
      return data;
    }

    data.pages?.forEach((page, pageIndex) => {
      // Check if page is valid
      if (!page || typeof page !== 'object') {
        console.warn(`replaceTextById: Invalid page at index ${pageIndex}`);
        return;
      }
      page.elements?.forEach((element, elementIndex) => {
        // Comprehensive element validation
        if (!element || typeof element !== 'object') {
          console.warn(`replaceTextById: Invalid element at page ${pageIndex}, element ${elementIndex}`);
          return;
        }

        // Check if element is text type and has valid ID
        if (element.type === "text" && element.id && idTextMap.hasOwnProperty(element.id)) {
          try {
            // Ensure properties object exists
            element.properties = element.properties || {};

            // Get the replacement text
            const replacementText = idTextMap[element.id];

            // Validate replacement text and handle different cases
            if (replacementText === null || replacementText === undefined) {
              element.properties.text = "Text not found";
              console.warn(`replaceTextById: Replacement text for ID ${element.id} is null/undefined, showing warning message`);
            } else if (replacementText === "") {
              element.properties.text = "Empty text";
              console.warn(`replaceTextById: Replacement text for ID ${element.id} is empty, showing warning message`);
            } else {
              // Convert to string to ensure it's always a string
              element.properties.text = String(replacementText);
            }

            console.log(`replaceTextById: Successfully processed text for ID ${element.id}`);

          } catch (error) {
            console.error(`replaceTextById: Error processing element with ID ${element.id}:`, error);
            // Set user-friendly error message
            element.properties = element.properties || {};
            element.properties.text = "Loading error";
          }
        }
      });
    });
    return data;
  }

  // Apply replacements
  const updatedJson = replaceTextById(jsonData, idTextMap);

  // Return the processed data instead of writing to file
  console.log(`JSON processing completed successfully`);
  return updatedJson;
}

module.exports = { replaceTextInJson };
