import React from "react";
import { styled } from "@mui/material/styles";
import { Collapse, Paper } from "@mui/material";
import { withModulesManager, formatMessage, Table } from "@openimis/fe-core";
import { injectIntl } from "react-intl";


const StyledCollapse = styled(Collapse)(({ theme }) => ({
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '& .tableContainer': {
    margin: theme.spacing(1),
  },
}));

class PolicyDetailsCollapse extends React.Component {
  getHeaders = () => {
    const { intl, modulesManager } = this.props;
    return [
      formatMessage(intl, "policy", "policies.policyValue"),
      formatMessage(intl, "policy", "policies.deduction"),
      formatMessage(intl, "policy", "policies.hospitalDeduction"),
      formatMessage(intl, "policy", "policies.nonHospitalDeduction"),
      formatMessage(intl, "policy", "policies.ceiling"),
      formatMessage(intl, "policy", "policies.hospitalCeiling"),
      formatMessage(intl, "policy", "policies.nonHospitalCeiling"),
      ...(modulesManager.getConf("fe-policy", "familyOrInsureePoliciesSummary.showBalance", false) 
        ? [formatMessage(intl, "policy", "policies.balance")] 
        : []),
    ];
  };

  itemFormatters = () => {
    const { modulesManager } = this.props;
    return [
      (i) => i.policyValue,
      (i) => i.ded,
      (i) => i.dedInPatient,
      (i) => i.dedOutPatient,
      (i) => i.ceiling,
      (i) => i.ceilingInPatient,
      (i) => i.ceilingOutPatient,
      ...(modulesManager.getConf("fe-policy", "familyOrInsureePoliciesSummary.showBalance", false) 
        ? [(i) => i.balance] 
        : []),
    ];
  };

  render() {
    const { open, policy, intl } = this.props;
    if (!policy) return null;

    return (
      <StyledCollapse in={open} timeout="auto" unmountOnExit>
        <Paper className="tableContainer" elevation={1}>
          <Table
            module="policy"
            headers={this.getHeaders()}
            items={[policy]}
            itemFormatters={this.itemFormatters()}
            withPagination={false}
            withHeader={true}
          />
        </Paper>
      </StyledCollapse>
    );
  }
}

export { StyledCollapse };
export default injectIntl(PolicyDetailsCollapse);
