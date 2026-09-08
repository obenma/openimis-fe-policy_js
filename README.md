# openIMIS Frontend Policy reference module
This repository holds the files of the openIMIS Frontend Policy reference module.



It is dedicated to be deployed as a module of [openimis-fe_js](https://github.com/openimis/openimis-fe_js).

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/openimis/openimis-fe-policy_js.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/openimis/openimis-fe-policy_js/alerts/)

## Main Menu Contributions
None

## Other Contributions
* `core.Router`: registering `policy/policies` routes in openIMIS client-side router
* `insuree.MainMenu`:

   **Policies** (`menu.policies` translation key)
   
* `insuree.EnquiryDialog`: `[FamilyOrInsureePoliciesSummary, InsureeEligibilityEnquiry, InsureeEligibilitySummary]`, adding the (family) policies details, ability to query eligibility on an item and service and remaining counts and amounts to enquiry dialog (of insuree module)
* `insuree.FamilyOverview.panels`: `[FamilyOrInsureePoliciesSummary]`,  policy section in the family overview

## Available Contribution Points
* `policy.Filter`, contributions point for the filter (searcher page)
* `policy.Policy`, contributions point for the policy master panel (in policy page)
* `policy.Policy.panels`, contributions point to add panels below the policy master panel (in policy page)
* `policy.PolicyValues`, contributions point for the policy values panel (in policy page)
* `policy.PolicyValues.panels`, contributions point to add panels below the policy values panel (in policy page)

## Published Components
* `policy.PolicyOfficerPicker`, picker for policy officers (from the database)
* `policy.PolicyStatusPicker`, picker for the policy status (idle, ready, active, suspended or expired), from (translated) constants (1, 2, 4, 8 or 16)
* `policy.PolicyStagePicker`, picker for policy stages (new or renew), from (translated) constants (N or R)
* `policy.FamilyOrInsureePoliciesSummary`, insuree (family) policies summary (by default contributed to insuree enquiry dialog)
* `policy.InsureeEligibilitySummary`, querying insuree eligibility to an item and service (by default contributed to insuree enquiry dialog)
* `policy.InsureeEligibilityEnquiry`, remaining counts and amounts of insuree (by default contributed to insuree enquiry dialog)
* `policy.InsureePolicyEligibilitySummary`, summary (expiry date and balance) of the last still valid insuree policy

## Dispatched Redux Actions
* `POLICY_INSUREE_POLICIES_{REQ|RESP|ERR}`, loading insuree policies summary (GraphQL: `policiesByFamilyOrInsuree`)
* `POLICY_INSUREE_ITEM_ELIGIBILITY_{REQ|RESP|ERR}`, query insuree eligibility for an item (GraphQL: `policyItemEligibilityByInsuree`)
* `POLICY_INSUREE_SERVICE_ELIGIBILITY_{REQ|RESP|ERR}`, query insuree eligibility for a service (GraphQL: 
`policyServiceEligibilityByInsuree`)
* `POLICY_INSUREE_ELIGIBILITY_{REQ|RESP|ERR}`, insuree eligibility summary (GraphQL: `policyEligibilityByInsuree`)
* `POLICY_FAMILY_POLICIES_{REQ|RESP|ERR}`, fetching the policies of the (redux) family into the redux state
* `POLICY_POLICY_OFFICERS_{REQ|RESP|ERR}`, fetching the policy officers (cached into PolicyOfficerPicker)
* `POLICY_POLICIES_{REQ|RESP|ERR}`, fetching policies (as triggered by the searcher)
* `POLICY_POLICY_{REQ|RESP|ERR}`, fetching one policy (full details)... as for the policy page
* `POLICY_FETCH_POLICY_VALUES__{REQ|RESP|ERR}`, request backend the policy (being created/updated) values (start date, expiry date and value)
* `POLICY_MUTATION_REQ`, sending a mutation (create, update, nenew, suspend or delete)
* `POLICY_MUTATION_ERR`, failed submitting a mutation
* `POLICY_{CREATE|UPDATE|RENEW|SUSPEND|DELETE}_POLICY_RESP`, create policy mutation response (i.e. when successfull)

## Other Modules Listened Redux Actions
None

## Other Modules Redux State Bindings
* `state.core.user`, to access user info (rights,...)
* `state.insuree`, loading insuree policies (,eligibility,...)

## Configurations Options
- `isDefaultFetchPolicyActivated`, manage default fetch behavior of policy searcher ; default: true
- `familyOrInsureePoliciesSummary.orderByExpiryDate`: Allows to set whether you want to sort policies by expiry date in ascending or descending order. Default: __"expiryDate"__ which means ascending order.
- `familyOrInsureePoliciesSummary.onlyActiveOrLastExpired`: Enables to choose whether you want to display only active and the last expired policies, or all. Default: __true__. 
- `minimumPolicyEffectiveDate`: Set minimum allowed date for effective date of a policy. Sets minimum for x days before current day. If 0 nothing is changed. Default: 0. 
- `isEligiblitySummaryEnabled`: Enables/disables remain counts/amounts in enquire. Enabled if true. Default true. 

