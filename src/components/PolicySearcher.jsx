import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { Button, Tooltip } from "@mui/material";
import { GetIconComponent } from "@openimis/fe-core";
const PeopleIcon = GetIconComponent("People")
const TabIcon = GetIconComponent("Tab")
const RenewIcon = GetIconComponent("Autorenew")
const DeleteIcon = GetIconComponent("Delete")
const SuspendIcon = GetIconComponent("Pause")

import {
  withModulesManager,
  formatMessageWithValues,
  formatDateFromISO,
  formatAmount,
  formatMessage,
  withHistory,
  historyPush,
  coreConfirm,
  journalize,
  Searcher,
  PublishedComponent,
  AmountInput,
} from "@openimis/fe-core";
import { fetchPolicySummaries, deletePolicy, suspendPolicy } from "../actions";
import {
  policyLabel,
  policyBalance,
  canDeletePolicy,
  canSuspendPolicy,
  canRenewPolicy,
} from "../utils/utils";

import PolicyFilter from "./PolicyFilter";

const POLICY_SEARCHER_CONTRIBUTION_KEY = "policy.PolicySearcher";

class PolicySearcher extends Component {
  state = {
    searchInitiated: false,
    initialFitlers: this.props.defaultFilters,
  };

  constructor(props) {
    super(props);
    this.rowsPerPageOptions = props.modulesManager.getConf(
      "fe-policy",
      "policyFilter.rowsPerPageOptions",
      [10, 20, 50, 100]
    );
    this.defaultPageSize = props.modulesManager.getConf(
      "fe-policy",
      "policyFilter.defaultPageSize",
      10
    );
    this.locationLevels = this.props.modulesManager.getConf(
      "fe-location",
      "location.Location.MaxLevels",
      4
    );
    this.isDefaultFetchPolicyActivated = this.props.modulesManager.getConf(
      "fe-policy",
      "isDefaultFetchPolicyActivated",
      true
    );
  }

  componentDidMount() {
    this.scheduleCanFetchPolicyDetails();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.confirmed && this.props.confirmed) {
      this.state.confirmedAction();
    } else if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState({ reset: this.state.reset + 1 });
    }
    if (
      prevState.searchInitiated !== this.state.searchInitiated ||
      prevState.initialFitlers !== this.state.initialFitlers
    ) {
      this.scheduleCanFetchPolicyDetails();
    }
  }

  fetch = (prms) => {
    this.props.fetchPolicySummaries(this.props.modulesManager, prms);
  };

  canFetchPolicyDetails = () => {
    if (this.state.searchInitiated === false && !!this.state.initialFitlers) {
      this.onFiltersApplied(this.state.initialFitlers);
    }
  };

  scheduleCanFetchPolicyDetails = () => {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(() => {
      this.canFetchPolicyDetails();
    }, 100);
  };

  rowIdentifier = (r) => r.uuid;

  filtersToQueryParams = (state) => {
    let prms = Object.keys(state.filters)
      .filter((f) => !!state.filters[f]["filter"])
      .map((f) => state.filters[f]["filter"]);
    if (!state.beforeCursor && !state.afterCursor) {
      prms.push(`first: ${state.pageSize}`);
    }
    if (!!state.afterCursor) {
      prms.push(`after: "${state.afterCursor}"`);
      prms.push(`first: ${state.pageSize}`);
    }
    if (!!state.beforeCursor) {
      prms.push(`before: "${state.beforeCursor}"`);
      prms.push(`last: ${state.pageSize}`);
    }
    if (!!state.orderBy) {
      prms.push(`orderBy: ["${state.orderBy}"]`);
    }
    return prms;
  };

  renewPolicy = (policy) =>
    historyPush(
      this.props.modulesManager,
      this.props.history,
      "policy.route.policy",
      [policy.uuid, policy.family.uuid, true]
    );

  confirmSuspend = (policy) => {
    let confirmedAction = () =>
      this.props.suspendPolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "SuspendPolicy.mutationLabel",
          { policy: policyLabel(this.props.modulesManager, policy) }
        )
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "suspendPolicyDialog.title",
          { label: policyLabel(this.props.modulesManager, policy) }
        ),
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "suspendPolicyDialog.message",
          {
            label: policyLabel(this.props.modulesManager, policy),
          }
        )
      );
    this.setState({ confirmedAction }, confirm);
  };

  confirmDelete = (policy) => {
    let confirmedAction = () =>
      this.props.deletePolicy(
        this.props.modulesManager,
        policy,
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "DeletePolicy.mutationLabel",
          { policy: policyLabel(this.props.modulesManager, policy) }
        )
      );
    let confirm = (e) =>
      this.props.coreConfirm(
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "deletePolicyDialog.title",
          { label: policyLabel(this.props.modulesManager, policy) }
        ),
        formatMessageWithValues(
          this.props.intl,
          "policy",
          "deletePolicyDialog.message",
          {
            label: policyLabel(this.props.modulesManager, policy),
          }
        )
      );
    this.setState({ confirmedAction }, confirm);
  };

  canDelete = (policy) => canDeletePolicy(this.props.rights, policy);
  canSuspend = (policy) => canSuspendPolicy(this.props.rights, policy);
  canRenew = (policy) =>
    !this.props.renew &&
    canRenewPolicy(this.props.rights, policy) &&
    policy.value != null;

  headers = (filters) => {
    const h = [
      "policy.policySummaries.enrollDate",
      "policy.policySummaries.name",
      "policy.policySummaries.effectiveDate",
      "policy.policySummaries.startDate",
      "policy.policySummaries.expiryDate",
      "policy.policySummaries.product",
      "policy.policySummaries.officer",
      "policy.policySummaries.stage",
      "policy.policySummaries.status",
      "policy.policySummaries.value",
      "policy.policySummaries.balance",
      filters?.showHistory?.value
        ? "policy.policySummaries.validityFrom"
        : null,
      filters?.showHistory?.value ? "policy.policySummaries.validityTo" : null,
      "policy.policySummaries.openFamily",
      "policy.policySummaries.openNewTab",
      "policy.policySummaries.renew",
      "policy.policySummaries.suspend",
      "policy.policySummaries.delete",
    ];
    return h;
  };

  sorts = (filters) => {
    const results = [
      ["enrollDate", false],
      [this.props.modulesManager.getRef("insuree.FamilyPicker.sort"), true],
      ["effectiveDate", false],
      ["startDate", false],
      ["expiryDate", false],
      [this.props.modulesManager.getRef("product.ProductPicker.sort"), true],
      [
        this.props.modulesManager.getRef("policy.PolicyOfficerPicker.sort"),
        true,
      ],
      ["stage", true],
      ["status", true],
      ["value", false],
      null,
      filters?.showHistory?.value ? ["validityFrom", false] : null,
      filters?.showHistory?.value ? ["validityTo", false] : null,
    ];
    return results;
  };

  itemFormatters = (filters) => {
    const formatters = [
      (policy) =>
        formatDateFromISO(
          this.props.modulesManager,
          this.props.intl,
          policy.enrollDate
        ),
      (policy) => `${policy.family.headInsuree.lastName} ${policy.family.headInsuree.otherNames}`,
      (policy) =>
        formatDateFromISO(
          this.props.modulesManager,
          this.props.intl,
          policy.effectiveDate
        ),
      (policy) =>
        formatDateFromISO(
          this.props.modulesManager,
          this.props.intl,
          policy.startDate
        ),
      (policy) =>
        formatDateFromISO(
          this.props.modulesManager,
          this.props.intl,
          policy.expiryDate
        ),
      (policy) => `${policy.product.code}`,
      (policy) => `${policy.officer?.code}`,
      (policy) => formatMessage(this.props.intl, "policy", `PolicyStage.${policy.stage}`),
      (policy) => formatMessage(this.props.intl, "policy", `PolicyStatus.${policy.status}`),
      (policy) => formatAmount(this.props.modulesManager, this.props.intl, policy.value),
      (policy) => formatAmount(this.props.modulesManager, this.props.intl, policyBalance(policy)),
      filters?.showHistory?.value
        ? (policy) =>
            formatDateFromISO(
              this.props.modulesManager,
              this.props.intl,
              policy.validityFrom
            )
        : null,
      filters?.showHistory?.value
        ? (policy) =>
            formatDateFromISO(
              this.props.modulesManager,
              this.props.intl,
              policy.validityTo
            )
        : null,
      (policy) => {
        if (!policy.family) return null;
        return (
          <Tooltip
            title={formatMessage(
              this.props.intl,
              "policy",
              "policySummaries.openFamilyButton.tooltip"
            )}
          >
            <Button
              startIcon={<PeopleIcon />}
              onClick={(e) =>
                !policy.clientMutationId &&
                historyPush(
                  this.props.modulesManager,
                  this.props.history,
                  "insuree.route.familyOverview",
                  [policy.family.uuid]
                )
              }
            >
              {formatMessage(
                this.props.intl,
                "policy",
                "policySummaries.openFamilyButton.buttonText"
              )}
            </Button>
          </Tooltip>
        );
      },
      (policy) => (
        <Tooltip
          title={formatMessage(
            this.props.intl,
            "policy",
            "policySummaries.openNewTabButton.tooltip"
          )}
        >
          <Button
            startIcon={<TabIcon />}
            onClick={(e) =>
              !policy.clientMutationId && this.props.onDoubleClick(policy, true)
            }
          >
            {formatMessage(
              this.props.intl,
              "policy",
              "policySummaries.openNewTabButton.buttonText"
            )}
          </Button>
        </Tooltip>
      ),
      (policy) =>
        this.canRenew(policy) && (
          <Tooltip
            title={formatMessage(
              this.props.intl,
              "policy",
              "action.RenewPolicy.tooltip"
            )}
          >
            <Button
              startIcon={<RenewIcon />}
              onClick={(e) =>
                !policy.clientMutationId && this.renewPolicy(policy)
              }
            >
              {formatMessage(
                this.props.intl,
                "policy",
                "action.RenewPolicy.buttonText"
              )}
            </Button>
          </Tooltip>
        ),
      (policy) =>
        this.canSuspend(policy) && (
          <Tooltip
            title={formatMessage(
              this.props.intl,
              "policy",
              "action.SuspendPolicy.tooltip"
            )}
          >
            <Button
              startIcon={<SuspendIcon />}
              onClick={(e) =>
                !policy.clientMutationId && this.confirmSuspend(policy)
              }
            >
              {formatMessage(
                this.props.intl,
                "policy",
                "action.SuspendPolicy.buttonText"
              )}
            </Button>
          </Tooltip>
        ),
      (policy) =>
        this.canDelete(policy) && (
          <Tooltip
            title={formatMessage(
              this.props.intl,
              "policy",
              "action.DeletePolicy.tooltip"
            )}
          >
            <Button
              startIcon={<DeleteIcon />}
              onClick={(e) =>
                !policy.clientMutationId && this.confirmDelete(policy)
              }
            >
              {formatMessage(
                this.props.intl,
                "policy",
                "action.DeletePolicy.buttonText"
              )}
            </Button>
          </Tooltip>
        ),
    ];
    return formatters;
  };

  onFiltersApplied = (filters) => {
    this.setState({
      searchInitiated: true,
      filters, // Update the active filters
    });
  };

  rowDisabled = (selection, i) => !!i.validityTo;
  rowLocked = (selection, i) => !!i.clientMutationId;

  render() {
    const {
      intl,
      policies,
      policiesPageInfo,
      fetchingPolicies,
      fetchedPolicies,
      errorPolicies,
      filterPaneContributionsKey,
      cacheFiltersKey,
      onDoubleClick,
    } = this.props;
    const { searchInitiated } = this.state;

    let count = policiesPageInfo.totalCount;

    return (
      <Fragment>
        <Searcher
          module="policy"
          cacheFiltersKey={cacheFiltersKey}
          FilterPane={PolicyFilter}
          filterPaneContributionsKey={filterPaneContributionsKey}
          items={policies}
          itemsPageInfo={policiesPageInfo}
          fetchingItems={fetchingPolicies}
          fetchedItems={fetchedPolicies}
          errorItems={errorPolicies}
          contributionKey={POLICY_SEARCHER_CONTRIBUTION_KEY}
          tableTitle={formatMessageWithValues(
            intl,
            "policy",
            "policySummaries",
            { count }
          )}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          defaultOrderBy="-enrollDate"
          fetch={
            this.isDefaultFetchPolicyActivated == false && searchInitiated
              ? this.fetch
              : this.isDefaultFetchPolicyActivated == true
              ? this.fetch
              : () => {}
          }
          rowIdentifier={this.rowIdentifier}
          filtersToQueryParams={this.filtersToQueryParams}
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          sorts={this.sorts}
          rowDisabled={this.rowDisabled}
          rowLocked={this.rowLocked}
          onDoubleClick={(i) => !i.clientMutationId && onDoubleClick(i)}
        />
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  rights:
    !!state.core && !!state.core.user && !!state.core.user.i_user
      ? state.core.user.i_user.rights
      : [],
  confirmed: state.core.confirmed,
  policies: state.policy.policies,
  policiesPageInfo: state.policy.policiesPageInfo,
  fetchingPolicies: state.policy.fetchingPolicies,
  fetchedPolicies: state.policy.fetchedPolicies,
  errorPolicies: state.policy.errorPolicies,
  submittingMutation: state.policy.submittingMutation,
  mutation: state.policy.mutation,
});

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchPolicySummaries,
      deletePolicy,
      suspendPolicy,
      coreConfirm,
      journalize,
    },
    dispatch
  );
};

export { POLICY_SEARCHER_CONTRIBUTION_KEY };
export default withModulesManager(
  withHistory(
    connect(mapStateToProps, mapDispatchToProps)(injectIntl(PolicySearcher))
  )
);
