import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { injectIntl } from "react-intl";
import clsx from "clsx";
import { styled } from "@mui/material/styles";
import { Divider, Grid, Paper, Typography, FormControlLabel, Checkbox, IconButton, Button } from "@mui/material";
import { GetIconComponent } from "@openimis/fe-core";
import PolicyDetailsCollapse from "./PolicyDetailsCollapse";

const AddIcon = GetIconComponent("Add")
const RenewIcon = GetIconComponent("Autorenew")
const DeleteIcon = GetIconComponent("Delete")
const SuspendIcon = GetIconComponent("Pause")


import {
  Table,
  PagedDataHandler,
  formatMessage,
  formatMessageWithValues,
  formatDateFromISO,
  withModulesManager,
  formatSorter,
  sort,
  withTooltip,
  historyPush,
  withHistory,
  coreConfirm,
  journalize,
  AmountInput,
} from "@openimis/fe-core";
import { fetchFamilyOrInsureePolicies, selectPolicy, deletePolicy, suspendPolicy } from "../actions";
import { RIGHT_POLICY_ADD } from "../constants";
import { policyLabel, canDeletePolicy, canSuspendPolicy, canRenewPolicy } from "../utils/utils";

const StyledPaper = styled(Paper)(({ theme }) => ({
  ...theme?.paper?.paper ?? {},
}));

const StyledPaperHeader = styled('div')(({ theme }) => ({
  ...theme?.paper?.header ?? {},
}));

const StyledTableTitle = styled('div')(({ theme }) => ({
  ...theme?.table?.title ?? {},
}));

const StyledTitle = styled('div')(({ theme }) => ({
  ...theme?.table?.title ?? {},
  padding: 0,
}));

const StyledFab = styled('div')(({ theme }) => ({
  ...theme?.fab ?? {},
}));

const StyledButton = styled('div')(({ theme }) => ({
  margin: theme?.spacing?.(1),
}));

const StyledItem = styled('div')(({ theme }) => ({
  padding: theme?.spacing?.(1),
}));

class FamilyOrInsureePoliciesSummary extends PagedDataHandler {
  state = {
    page: 0,
    pageSize: this.props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.defaultPageSize",
      5
    ),
    afterCursor: null,
    beforeCursor: null,
  };

  constructor(props) {
    super(props);
    this.rowsPerPageOptions = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.rowsPerPageOptions",
      [5, 10, 20]
    );
    this.defaultPageSize = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.defaultPageSize",
      5
    );
    this.showBalance = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.showBalance",
      false
    );
    this.onlyActiveOrLastExpired = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.onlyActiveOrLastExpired",
      true
    );
    this.orderByExpiryDate = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.orderByExpiryDate",
      "expiryDate"
    );
    this.useCollapsibleDetails = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.useCollapsibleDetails",
      true
    );
    this.state = {
      ...this.state,
      expandedPolicy: null
    };
    this.hideSecondariesColumns = props.modulesManager.getConf(
      "fe-policy",
      "familyOrInsureePoliciesSummary.hideSecondariesColumns",
      true
    );
  }

  componentDidMount() {
    this.setState(
      {
        confirmedAction: null,
        onlyActiveOrLastExpired: this.onlyActiveOrLastExpired,
        orderBy: this.orderByExpiryDate,
      },
      (e) => this.query()
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.insureeChanged(prevProps) || this.familyChanged(prevProps)) {
      this.query();
    } else if (!prevProps.confirmed && this.props.confirmed && !!this.state.confirmedAction) {
      this.state.confirmedAction();
    } else if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState({ reset: this.state.reset + 1 });
    }
  }

  addNewPolicy = () =>
    historyPush(this.props.modulesManager, this.props.history, "policy.route.policy", [
      "_NEW_",
      this.props.family.uuid,
    ]);

  renewPolicy = (i) =>
    historyPush(this.props.modulesManager, this.props.history, "policy.route.policy", [
      i.policyUuid,
      this.props.family.uuid,
      true,
    ]);

  confirmSuspend = (policy) => {
    policy.family = this.props.family;
    let confirmedAction = () =>
      this.props.suspendPolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(this.props.intl, "policy", "SuspendPolicy.mutationLabel", {
          policy: policyLabel(this.props.modulesManager, policy),
        })
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(this.props.intl, "policy", "suspendPolicyDialog.title", {
          label: policyLabel(this.props.modulesManager, policy),
        }),
        formatMessageWithValues(this.props.intl, "policy", "suspendPolicyDialog.message", {
          label: policyLabel(this.props.modulesManager, policy),
        })
      );
    this.setState({ confirmedAction }, confirm);
  };

  confirmDelete = (policy) => {
    let confirmedAction = () =>
      this.props.deletePolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(this.props.intl, "policy", "DeletePolicy.mutationLabel", {
          policy: policyLabel(this.props.modulesManager, policy),
        })
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(this.props.intl, "policy", "deletePolicyDialog.title", {
          label: policyLabel(this.props.modulesManager, policy),
        }),
        formatMessageWithValues(this.props.intl, "policy", "deletePolicyDialog.message", {
          label: policyLabel(this.props.modulesManager, policy),
        })
      );
    this.setState({ confirmedAction }, confirm);
  };

  onDoubleClick = (i, newTab = false) => {
    historyPush(this.props.modulesManager, this.props.history, "policy.route.policy", [
      i.policyUuid,
      this.props.family.uuid,
    ]);
  };

  insureeChanged = (prevProps) =>
    (!prevProps.insuree && !!this.props.insuree) ||
    (!!prevProps.insuree && !this.props.insuree) ||
    (!!prevProps.insuree &&
      !!this.props.insuree &&
      !!this.props.insuree.chfId &&
      (prevProps.insuree.chfId == null || prevProps.insuree.chfId !== this.props.insuree.chfId));
  familyChanged = (prevProps) =>
    (!prevProps.family && !!this.props.family) ||
    (!!prevProps.family && !this.props.family) ||
    (!!prevProps.family &&
      !!this.props.family &&
      !!this.props.family.uuid &&
      (prevProps.family.uuid == null || prevProps.family.uuid !== this.props.family.uuid));

  queryPrms() {
    let prms = [`orderBy: "${this.state.orderBy}"`, `activeOrLastExpiredOnly: ${!!this.state.onlyActiveOrLastExpired}`];
    if (!!this.props.insuree && !!this.props.insuree.chfId) {
      prms.push(`chfId:"${this.props.insuree.chfId}"`);
      return prms;
    } else if (this.props.insureeEnquiry?.chfId) {
      prms.push(`chfId:"${this.props.insureeEnquiry?.chfId}"`);
      return prms;
    } else if (!!this.props.family && !!this.props.family.uuid) {
      prms.push(`familyUuid:"${this.props.family.uuid}"`);
      return prms;
    }
  }

  onChangeSelection = (i) => {
    const { selectPolicy, disableSelection } = this.props;
  
    if (disableSelection) {
      return;
    }
    if (this.useCollapsibleDetails && i && i[0]) {
      this.togglePolicyDetails(i[0].policyUuid);
    } else {
      this.setState({ expandedPolicy: null });
    }
  
    selectPolicy(i[0] || null);
    if (this.props.onChangeSelection) {
      this.props.onChangeSelection(i);
    }
  };

  toggleCheckbox = (key) => {
    this.setState(
      (state, props) => ({
        [key]: !state[key],
      }),
      (e) => this.query()
    );
  };

  headers = () => {
    let h = [
      "policies.productCode",
      "policies.productName",
      "policies.effectiveDate",
      "policies.enrolmentDate",
      "policies.expiryDate",
      "policies.status",
      ...(this.useCollapsibleDetails ? [] : [
        "policies.policyValue",
        "policies.deduction",
        "policies.hospitalDeduction",
        "policies.nonHospitalDeduction",
        "policies.ceiling",
        "policies.hospitalCeiling",
        "policies.nonHospitalCeiling",
        ...(this.showBalance ? ["policies.balance"] : [])
      ]),
      "policies.policyValue",
      !this.hideSecondariesColumns ? (
        "policies.deduction", 
        "policies.hospitalDeduction", 
        "policies.nonHospitalDeduction", 
        "policies.ceiling", 
        "policies.hospitalCeiling", 
        "policies.nonHospitalCeiling") : null,
    ];
    h.push("", "", "");
    return h;
  };

  sorter = (attr, asc = true) => [
    () =>
      this.setState(
        (state, props) => ({ orderBy: sort(state.orderBy, attr, asc) }),
        (e) => this.query()
      ),
    () => formatSorter(this.state.orderBy, attr, asc),
  ];

  headerActions = () => {
    let a = [
      this.sorter("productCode"),
      this.sorter("productName"),
      this.sorter("effectiveDate"),
      this.sorter("enrolmentDate"),
      this.sorter("expiryDate"),
      this.sorter("status"),
      this.sorter("policyValue"),
      this.sorter("deduction"),
      this.sorter("hospitalDeduction"),
      this.sorter("nonHospitalDeduction"),
      this.sorter("ceiling"),
      this.sorter("hospitalCeiling"),
      this.sorter("nonHospitalCeiling"),
    ];
    if (this.showBalance) {
      a.push(this.sorter("balance"));
    }
    return a;
  };

  rowLocked = (policy) => !!policy.clientMutationId;
  canDelete = (policy) => !this.props.readOnly && canDeletePolicy(this.props.rights, policy);
  canSuspend = (policy) => !this.props.readOnly && canSuspendPolicy(this.props.rights, policy);
  canRenew = (policy) => !this.props.readOnly && canRenewPolicy(this.props.rights, policy) && policy.policyValue != null

  togglePolicyDetails = (policyUuid) => {
    this.setState(prevState => {
      const newState = prevState.expandedPolicy === policyUuid ? null : policyUuid;
      return { expandedPolicy: newState };
    });
  };  
  
  itemFormatters = () => {
    let f = [
      (i) => i.productCode,
      (i) => i.productName,
      (i) => formatDateFromISO(this.props.modulesManager, this.props.intl, i.effectiveDate),
      (i) => formatDateFromISO(this.props.modulesManager, this.props.intl, i.enrollDate),
      (i) => formatDateFromISO(this.props.modulesManager, this.props.intl, i.expiryDate),
      (i) => formatMessage(this.props.intl, "policy", `policies.status.${i.status}`),
      (i) => <AmountInput value={i.policyValue} readOnly />,
      !this.hideSecondariesColumns ? (
        (i) => i.ded,
        (i) => i.dedInPatient,
        (i) => i.dedOutPatient,
        (i) => i.ceiling,
        (i) => i.ceilingInPatient,
        (i) => i.ceilingOutPatient) : null,
    ];

    if (!this.useCollapsibleDetails) {
      f = [
        ...f,
        (i) => <AmountInput value={i.policyValue} readOnly />,
        (i) => i.ded,
        (i) => i.dedInPatient,
        (i) => i.dedOutPatient,
        (i) => i.ceiling,
        (i) => i.ceilingInPatient,
        (i) => i.ceilingOutPatient,
      ];
      
      if (this.showBalance) {
        f.push((i) => i.balance);
      }
    }
    f.push((i) =>
      !this.props.readOnly && this.canRenew(i)
        ? withTooltip(
            <Button startIcon={<RenewIcon />} onClick={(e) => this.renewPolicy(i)}>
              {formatMessage(this.props.intl, "policy", "action.RenewPolicy.buttonText")}
            </Button>,
            formatMessage(this.props.intl, "policy", "action.RenewPolicy.tooltip")
          )
        : null
    );
    f.push((i) =>
      !this.props.readOnly && this.canSuspend(i)
        ? withTooltip(
            <Button startIcon={<SuspendIcon />} onClick={(e) => this.confirmSuspend(i)}>
              {formatMessage(this.props.intl, "policy", "action.SuspendPolicy.buttonText")}
            </Button>,
            formatMessage(this.props.intl, "policy", "action.SuspendPolicy.tooltip")
          )
        : null
    );
    f.push((i) =>
      !this.props.readOnly && this.canDelete(i)
        ? withTooltip(
            <Button startIcon={<DeleteIcon />} onClick={(e) => this.confirmDelete(i)}>
              {formatMessage(this.props.intl, "policy", "action.DeletePolicy.buttonText")}
            </Button>,
            formatMessage(this.props.intl, "policy", "action.DeletePolicy.tooltip")
          )
        : null
    );
    return f;
  };

  header = () => {
    const { intl, pageInfo, insuree } = this.props;
    if (insuree?.chfId) {
      return formatMessageWithValues(intl, "policy", "policiesOfInsuree.header", {
        count: pageInfo.totalCount,
        chfId: insuree.chfId,
      });
    } else {
      return formatMessageWithValues(intl, "policy", "policies.header", { count: pageInfo.totalCount });
    }
  };

  itemIdentifier = (i) => i.policyUuid;

  render() {
    const {
      classes,
      intl,
      rights,
      fetchingPolicies,
      policies,
      pageInfo,
      errorPolicies,
      hideAddPolicyButton = false,
      family,
      insuree,
      readOnly,
      insureeEnquiry,
      disableSelection,
      className,
    } = this.props;

    if ((!family || !family.uuid) && (!insuree || !insuree.uuid) && (!insureeEnquiry?.uuid))  {
      console.error(
        "FamilyOrInsureePoliciesSummary: No valid family, insuree, or insureeEnquiry found. " +
          "Component will not render."
      );
      return null;
    }

    let actions =
      hideAddPolicyButton || !!readOnly || !rights.includes(RIGHT_POLICY_ADD) 
        ? []
        : [
            {
              button: (
                <Button startIcon={<AddIcon />} onClick={this.addNewPolicy}>
                  {formatMessage(intl, "policy", "action.AddPolicy.buttonText")}
                </Button>
              ),
              tooltip: formatMessage(intl, "policy", "action.AddPolicy.tooltip"),
            },
          ];
    
    const { expandedPolicy } = this.state;
    
    return (
      <StyledPaper className={className}>
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          className={clsx("paperHeader", "tableTitle")}
        >
          <Grid>
            <StyledTitle>{this.header()}</StyledTitle>
          </Grid>
          <Grid>
            <Grid container alignItems="center" spacing={3}>
              <Grid>
                <FormControlLabel
                  control={
                    <Checkbox
                      color="primary"
                      checked={!!this.state.onlyActiveOrLastExpired}
                      onChange={(e) => this.toggleCheckbox("onlyActiveOrLastExpired")}
                    />
                  }
                  label={formatMessage(intl, "policy", "policies.onlyActiveOrLastExpired")}
                />
              </Grid>
              {actions.map((a, idx) => {
                return (
                  <Grid key={`form-action-${idx}`}>
                    {withTooltip(a.button, a.tooltip)}
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
        <Divider />
        <Table
          module="policy"
          headers={this.headers()}
          headerActions={this.headerActions()}
          items={policies}
          itemIdentifier={this.itemIdentifier}
          fetching={fetchingPolicies}
          itemFormatters={this.itemFormatters()}
          error={errorPolicies}
          withSelection={disableSelection ? false : "single"}
          withPagination={true}
          rowsPerPageOptions={this.rowsPerPageOptions}
          page={this.state.page}
          pageSize={this.state.pageSize}
          count={pageInfo?.totalCount || 0}
          onChangePage={this.onChangePage}
          onChangeRowsPerPage={this.onChangeRowsPerPage}
          rowLocked={this.rowLocked}
          onDoubleClick={this.onDoubleClick}
          onChangeSelection={this.onChangeSelection}
        />

        {this.useCollapsibleDetails && Array.isArray(policies) && policies.map(policy => {
          const isOpen = expandedPolicy === policy?.policyUuid;
          return (
            <PolicyDetailsCollapse
              key={policy?.policyUuid || Math.random()}
              open={isOpen}
              policy={policy}
              modulesManager={this.props.modulesManager}
              intl={intl}
            />
          );
        })}
      </StyledPaper>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  fetchingPolicies: state.policy.fetchingPolicies,
  fetchedPolicies: state.policy.fetchedPolicies,
  policies: state.policy.policies,
  pageInfo: state.policy.policiesPageInfo,
  errorPolicies: state.policy.errorPolicies,
  family: state.insuree.family || {},
  insureeEnquiry: state?.insuree?.insureeEnquiry,
  insuree: state.insuree.insuree,
  confirmed: state.core.confirmed,
  submittingMutation: state.policy.submittingMutation,
  mutation: state.policy.mutation,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    { fetch: fetchFamilyOrInsureePolicies, selectPolicy, deletePolicy, suspendPolicy, coreConfirm, journalize },
    dispatch
  );
};

export { StyledPaper };
export { FamilyOrInsureePoliciesSummary };
export default withHistory(
  withModulesManager(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(injectIntl(FamilyOrInsureePoliciesSummary))
  )
);
