import { useMemo } from "react";
import { useGraphqlQuery } from "@openimis/fe-core";
import _ from "lodash";

export const useContributionPlanQuery = (filters, config) => {
  const { isLoading, error, data, refetch } = useGraphqlQuery(
    `
    query (
      $first: Int, $last: Int, $before: String, $after: String, $isDeleted: Boolean, $showHistory: Boolean,
      $applyDefaultValidityFilter: Boolean, $orderBy: [String]
    ) {
      contributionPlan(
        first: $first, last: $last, before: $before, after: $after, isDeleted: $isDeleted, showHistory: $showHistory,
        applyDefaultValidityFilter: $applyDefaultValidityFilter, orderBy: $orderBy
      ) {
        totalCount
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            code
            name
            calculation
            jsonExt
            benefitPlan
            benefitPlanId
            benefitPlanTypeName
            periodicity
            dateValidFrom
            dateValidTo
            isDeleted
          }
        }
      }
    }
    `,
    filters.filters,
    config,
  );

  const contributionPlan = useMemo(() => (data ? _.map(data.contributionPlan?.edges, "node") : []), [data]);
  const pageInfo = useMemo(
    () => (data ? Object.assign({ totalCount: data.contributionPlan?.totalCount }, data.contributionPlan?.pageInfo) : {}),
    [data],
  );

  return { isLoading, error, data: { contributionPlan, pageInfo }, refetch };
};
