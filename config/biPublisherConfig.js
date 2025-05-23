const BI_PUBLISHER_FOLDER_PATH = '/Custom/Human Capital Management/FusionSQLtoolTest1'; // Default folder path
const CATALOG_SERVICE_PATH = '/xmlpserver/services/v2/CatalogService';
const REPORT_SERVICE_PATH = '/xmlpserver/services/v2/ReportService';

// Base64 encoded string for the initial empty data model from the Python script
const EMPTY_DM_OBJECT_DATA_BASE64 = "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";

// Decoded XDM Template for updating with SQL
const XDM_TEMPLATE = `<?xml version = '1.0' encoding = 'utf-8'?>
<dataModel xmlns="http://xmlns.oracle.com/oxp/xmlp" version="2.0" xmlns:xdm="http://xmlns.oracle.com/oxp/xmlp" xmlns:xsd="http://wwww.w3.org/2001/XMLSchema" defaultDataSourceRef="AuditViewDB">
   <description>
      <![CDATA[undefined]]>
   </description>
   <dataProperties>
      <property name="include_parameters" value="false"/>
      <property name="include_null_Element" value="true"/>
      <property name="include_rowsettag" value="false"/>
      <property name="exclude_tags_for_lob" value="false"/>
      <property name="xml_tag_case" value="upper"/>
      <property name="generate_output_format" value="xml"/>
      <property name="sql_monitor_report_generated" value="false"/>
      <property name="optimize_query_executions" value="false"/>
   </dataProperties>
   <dataSets>
      <dataSet name="FST2" type="simple">
         <sql dataSourceRef="ApplicationDB_HCM" nsQuery="true" sp="true" xmlRowTagName="" bindMultiValueAsCommaSepStr="false">
            <![CDATA[DECLARE
    type refcursor is REF CURSOR;
    xdo_cursor refcursor;
        queryStr varchar2(32767);
    BEGIN
    queryStr := '{SQL_QUERY_PLACEHOLDER}';
    OPEN :xdo_cursor FOR queryStr;
END;]]>
         </sql>
      </dataSet>
   </dataSets>
   <output rootName="DATA_DS" uniqueRowName="false">
      <nodeList name="FST2"/>
   </output>
   <eventTriggers/>
   <lexicals/>
   <parameters>
      <parameter name="xdo_cursor" dataType="xsd:string" rowPlacement="1">
         <input/>
      </parameter>
   </parameters>
   <valueSets/>
   <bursting/>
   <validations>
      <validation>N</validation>
   </validations>
   <display>
      <layouts>
         <layout name="FST2" left="280px" top="349px"/>
         <layout name="DATA_DS" left="0px" top="349px"/>
      </layouts>
      <groupLinks/>
   </display>
</dataModel>`;


module.exports = {
  BI_PUBLISHER_FOLDER_PATH,
  CATALOG_SERVICE_PATH,
  REPORT_SERVICE_PATH,
  EMPTY_DM_OBJECT_DATA_BASE64,
  XDM_TEMPLATE,
};
